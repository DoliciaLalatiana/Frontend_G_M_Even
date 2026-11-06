import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  PieChart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Trophy,
  WalletCards,
  Wrench,
} from 'lucide-react'
import DataTable from '../components/common/DataTable'
import Field from '../components/common/Field'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import StatCard from '../components/common/StatCard'
import { useConfirm } from '../context/ConfirmContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { evolutionMensuelle, fluxSemaine, repartitionIncidents } from '../data/rapports'
import { computeRapportStats } from '../services/stockService'
import {
  formatCurrency,
  formatDate,
  formatMonth,
  formatNumber,
  formatPercent,
  todayISO,
} from '../utils/format'

const PERIODS = [
  { key: 'semaine', label: 'Cette semaine', days: 7, suffix: 'de la semaine' },
  { key: 'mois', label: 'Ce mois', days: 30, suffix: 'du mois' },
  { key: 'trimestre', label: 'Trimestre', days: 92, suffix: 'du trimestre' },
  { key: 'annee', label: 'Année', days: 365, suffix: 'de l’année' },
]

const REPORT_TYPES = ['Inventaire', 'Emprunts', 'Retours', 'Maintenance', 'Performance']
const REPORT_FORMATS = ['PDF', 'CSV', 'XLSX']

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((item) => (
        <div className="chart-tooltip__row" key={item.dataKey}>
          <span>{item.name}</span>
          <strong>{formatNumber(item.value)}</strong>
        </div>
      ))}
    </div>
  )
}

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const emptyDraft = () => ({
  titre: '',
  type: 'Performance',
  format: 'PDF',
  date: todayISO(),
})

const Rapports = () => {
  const {
    materiels,
    categories,
    emprunts,
    retours,
    utilisateurs,
    rapports,
    addRapport,
    deleteRapport,
  } = useData()
  const { pushToast } = useToast()
  const confirm = useConfirm()

  const [period, setPeriod] = useState('trimestre')
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState(emptyDraft())
  const [errors, setErrors] = useState({})
  const [refreshing, setRefreshing] = useState(false)

  const activePeriod = PERIODS.find((item) => item.key === period) || PERIODS[2]

  const cutoff = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - activePeriod.days + 1)
    return date
  }, [activePeriod])

  const inPeriod = (value) => !value || new Date(value) >= cutoff

  const periodEmprunts = useMemo(() => emprunts.filter((item) => inPeriod(item.dateEmprunt)), [cutoff, emprunts])
  const periodRetours = useMemo(() => retours.filter((item) => inPeriod(item.dateRetour)), [cutoff, retours])

  const stats = useMemo(
    () =>
      computeRapportStats({
        materiaux: materiels,
        emprunts: periodEmprunts,
        retours: periodRetours,
        evenements: [],
        utilisateurs,
        categories,
      }),
    [categories, materiels, periodEmprunts, periodRetours, utilisateurs],
  )

  const incidents = useMemo(
    () => materiels.filter((item) => ['Endommagé', 'Incomplet', 'Maintenance'].includes(item.etat)),
    [materiels],
  )

  const incidentRate = materiels.length ? (incidents.length / materiels.length) * 100 : 0
  const topMateriels = stats.topMateriels.filter((item) => item.sorties > 0)
  const usageCategories = stats.usageCategories.slice(0, 6)
  const flowData = period === 'semaine' ? fluxSemaine : evolutionMensuelle
  const flowXKey = period === 'semaine' ? 'jour' : 'mois'
  const flowSortiesKey = period === 'semaine' ? 'sorties' : 'emprunts'
  const flowRetoursKey = period === 'semaine' ? 'retours' : 'retours'
  const flowSubtitle =
    period === 'semaine'
      ? 'Dynamique des mouvements matériels sur les sept derniers jours'
      : 'Dynamique mensuelle des mouvements matériels sur le semestre'

  const filteredRapports = useMemo(
    () => [...rapports].filter((item) => inPeriod(item.date)).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [cutoff, rapports],
  )

  const refresh = () => {
    setRefreshing(true)
    window.setTimeout(() => {
      setRefreshing(false)
      pushToast({
        title: 'Métriques actualisées',
        message: 'Les indicateurs de performance ont été recalculés sur la période sélectionnée.',
      })
    }, 650)
  }

  const openPlan = () => {
    setDraft(emptyDraft())
    setErrors({})
    setFormOpen(true)
  }

  const generateReport = async (format, label = 'Bilan du parc') => {
    const auteur =
      utilisateurs.find((item) => item.role === 'Administrateur')?.nom ||
      utilisateurs[0]?.nom ||
      'Système'
    const rapport = await addRapport({
      titre: `${label} — ${formatMonth()}`,
      type: format === 'CSV' ? 'Inventaire' : 'Performance',
      format,
      date: todayISO(),
      taille: format === 'CSV' ? '640 Ko' : '2,1 Mo',
      auteur,
    })
    pushToast({
      title: 'Rapport généré',
      message: `${rapport?.titre || label} a été ajouté aux archives (${format}).`,
    })
  }

  const exportCsv = () => {
    const headers = [
      'Référence',
      'Matériel',
      'Catégorie',
      'Quantité totale',
      'Disponible',
      'Valeur unitaire',
      'État',
      'Emplacement',
    ]
    const categorieNom = (id) => categories.find((item) => item.id === id)?.nom || 'Sans catégorie'
    const lines = materiels.map((item) =>
      [
        item.reference,
        item.nom,
        categorieNom(item.categorieId),
        item.quantiteTotale,
        item.quantiteDisponible,
        item.valeur,
        item.etat,
        item.emplacement,
      ]
        .map(escapeCsv)
        .join(';'),
    )
    const csv = `\uFEFF${[headers.map(escapeCsv).join(';'), ...lines].join('\r\n')}`
    downloadFile(csv, `parc-materiel-${todayISO()}.csv`, 'text/csv;charset=utf-8')
    void generateReport('CSV', 'Export brut du parc')
  }

  const downloadReport = (rapport) => {
    if (rapport.format === 'CSV') {
      exportCsv()
      return
    }
    pushToast({
      title: 'Archive prête',
      message: `${rapport.titre} est disponible au format ${rapport.format}.`,
    })
  }

  const removeReport = async (rapport) => {
    const ok = await confirm({
      title: 'Supprimer ce rapport ?',
      message: `${rapport.titre} sera retiré de l’historique des livrables.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    })
    if (!ok) return
    const result = await deleteRapport(rapport.id)
    if (!result?.ok) {
      pushToast({ title: 'Suppression impossible', message: result?.message || "Les rapports sont conservés dans l'historique.", type: 'warning' })
      return
    }
    pushToast({ title: 'Rapport supprimé', message: 'Le livrable a été retiré de l’historique.' })
  }

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!draft.titre.trim()) next.titre = 'Le titre du rapport est requis.'
    if (!draft.date) next.date = 'La date de génération est requise.'
    setErrors(next)
    if (Object.keys(next).length) return
    const auteur =
      utilisateurs.find((item) => item.role === 'Administrateur')?.nom ||
      utilisateurs[0]?.nom ||
      'Système'
    await addRapport({
      titre: draft.titre.trim(),
      type: draft.type,
      format: draft.format,
      date: draft.date,
      taille: draft.format === 'PDF' ? '2,0 Mo' : draft.format === 'XLSX' ? '1,1 Mo' : '620 Ko',
      auteur,
    })
    setFormOpen(false)
    pushToast({ title: 'Rapport planifié', message: 'Le livrable apparaît dans l’historique des exports.' })
  }

  const columns = [
    {
      key: 'titre',
      label: 'Rapport',
      render: (row) => (
        <div className="report-row-title">
          <span
            className="report-file"
            style={{ '--tone': row.format === 'PDF' ? 'var(--danger)' : row.format === 'CSV' ? 'var(--cyan)' : 'var(--violet-light)' }}
          >
            {row.format}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="user-cell__name">{row.titre}</div>
            <div className="cell-sub">{row.type} · {row.taille}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'auteur',
      label: 'Auteur',
      render: (row) => <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.auteur}</span>,
    },
    {
      key: 'date',
      label: 'Généré le',
      render: (row) => <span className="mono" style={{ fontSize: 9.5 }}>{formatDate(row.date)}</span>,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <div className="table-actions">
          <button
            type="button"
            className="btn-icon is-cyan"
            title="Télécharger"
            aria-label={`Télécharger ${row.titre}`}
            onClick={() => downloadReport(row)}
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            className="btn-icon is-danger"
            title="Supprimer"
            aria-label={`Supprimer ${row.titre}`}
            onClick={() => removeReport(row)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="Audit logistique · analyse rentabilité du parc"
        title="Rapports & statistiques"
        subtitle="Indicateurs de performance, taux de rotation par famille, analyse SAV et bilan des saisons événementielles."
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={() => generateReport('PDF', 'Bilan trimestriel')}>
              <FileText size={15} />
              Bilan trimestriel (PDF)
            </button>
            <button type="button" className="btn btn-secondary" onClick={exportCsv}>
              <FileSpreadsheet size={15} />
              Export CSV
            </button>
            <button type="button" className="btn btn-ghost" onClick={openPlan}>
              <CalendarClock size={15} />
              Planifier
            </button>
          </>
        }
      />

      <div className="report-filters">
        <div className="period-tabs">
          <span className="metrics-strip__label" style={{ marginRight: 3 }}>Période</span>
          {PERIODS.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`pill ${period === item.key ? 'is-active' : ''}`}
              onClick={() => setPeriod(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            Depuis le {formatDate(cutoff)}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'spin' : undefined} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="grid-kpi grid-kpi--4">
        <StatCard
          icon={<ShieldCheck size={16} />}
          label="Conformité des retours"
          value={formatPercent(stats.tauxConformite)}
          trend={`${formatNumber(periodRetours.length)} retours`}
          trendDirection="flat"
          foot={`Contrôles qualité ${activePeriod.suffix}`}
          tone="var(--success)"
        />
        <StatCard
          icon={<Wrench size={16} />}
          label="Références en incident"
          value={formatPercent(incidentRate, 1)}
          trend={`${incidents.length} réf.`}
          trendDirection="down"
          foot="Matériel endommagé, incomplet ou en maintenance"
          tone="var(--danger)"
        />
        <StatCard
          icon={<WalletCards size={16} />}
          label="Valeur du parc"
          value={formatCurrency(stats.valeurParc)}
          trend={`${formatNumber(materiels.length)} réf.`}
          trendDirection="up"
          foot="Valorisation des unités en inventaire"
          tone="var(--violet-light)"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Emprunts actifs"
          value={formatNumber(stats.empruntsActifs)}
          trend={`${formatNumber(stats.totalSorties)} unités`}
          trendDirection="up"
          foot={`Sorties enregistrées ${activePeriod.suffix}`}
          tone="var(--cyan)"
        />
      </div>

      <div className="grid-7-5">
        <div className="glass-card chart-card">
          <div className="chart-card__head">
            <div>
              <div className="chart-card__title">
                <Sparkles size={14} className="text-cyan" />
                Flux temporel : sorties vs réintégrations
              </div>
              <p className="chart-card__subtitle">{flowSubtitle}</p>
            </div>
            <div className="chart-legend">
              <span className="chart-legend__item">
                <span className="chart-legend__dot" style={{ '--tone': 'var(--violet-light)' }} />
                Emprunts
              </span>
              <span className="chart-legend__item">
                <span className="chart-legend__dot" style={{ '--tone': 'var(--cyan)' }} />
                Retours
              </span>
            </div>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportGradSorties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8054D8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8054D8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="reportGradRetours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#27D9E8" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#27D9E8" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(170,182,204,0.09)" vertical={false} />
                <XAxis
                  dataKey={flowXKey}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#AAB6CC', fontSize: 10 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(170,182,204,0.65)', fontSize: 9 }}
                  width={46}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(39,217,232,0.22)' }} />
                <Area
                  type="monotone"
                  dataKey={flowSortiesKey}
                  name="Emprunts"
                  stroke="#A47BF5"
                  strokeWidth={2}
                  fill="url(#reportGradSorties)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey={flowRetoursKey}
                  name="Retours"
                  stroke="#27D9E8"
                  strokeWidth={2}
                  fill="url(#reportGradRetours)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="insight-strip">
            <span className="insight-strip__icon">
              <TrendingUp size={12} />
            </span>
            <span>
              <strong>{formatNumber(stats.totalSorties)}</strong> unités sorties et{' '}
              <strong>{formatNumber(stats.totalRetours)}</strong> unités réintégrées sur la période ·
              conformité de <strong>{formatPercent(stats.tauxConformite)}</strong>
            </span>
          </div>

          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <Link to="/emprunts" className="btn btn-ghost btn-sm">
              Voir les mouvements
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="glass-card chart-card">
          <div className="chart-card__head">
            <div>
              <div className="chart-card__title">
                <PieChart size={14} className="text-violet" />
                Taux d’utilisation par famille
              </div>
              <p className="chart-card__subtitle">Sorties cumulées rapportées au stock total</p>
            </div>
            <span className="badge badge--cyan">
              <span className="badge__dot" />
              Cible 70%
            </span>
          </div>

          <div className="settings-col" style={{ gap: 12 }}>
            {usageCategories.map((categorie, index) => (
              <div key={categorie.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: 'var(--text)' }}>{categorie.nom}</span>
                  <span
                    className="mono"
                    style={{ fontSize: 9.5, color: categorie.taux >= 70 ? 'var(--cyan)' : 'var(--text-muted)' }}
                  >
                    {categorie.taux}%
                  </span>
                </div>
                <div className="progress">
                  <div
                    className="progress__bar"
                    style={{
                      width: `${categorie.taux}%`,
                      '--tone': categorie.couleur || (index % 2 ? 'var(--violet)' : 'var(--cyan)'),
                    }}
                  />
                </div>
              </div>
            ))}
            {!usageCategories.length && (
              <p className="muted" style={{ fontSize: 10 }}>Aucune famille de matériel enregistrée.</p>
            )}
          </div>

          <div className="insight-strip" style={{ marginTop: 14 }}>
            <span className="insight-strip__icon">
              <Package size={12} />
            </span>
            <span>
              <strong>{formatNumber(materiels.length)}</strong> références actives ·{' '}
              <strong>{incidents.length}</strong> en incident
            </span>
          </div>
        </div>
      </div>

      <div className="grid-7-5">
        <div className="glass-card chart-card">
          <div className="chart-card__head">
            <div>
              <div className="chart-card__title">
                <Trophy size={14} className="text-cyan" />
                Top 5 des matériels les plus sollicités
              </div>
              <p className="chart-card__subtitle">Classement des références par volume de sorties</p>
            </div>
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{activePeriod.label}</span>
          </div>

          {topMateriels.length ? (
            <div className="top-materiel-list">
              {topMateriels.map((materiel, index) => (
                <div className="top-materiel" key={materiel.id}>
                  <span
                    className="top-materiel__rank"
                    style={{ '--tone': index === 0 ? 'var(--cyan)' : index === 1 ? 'var(--violet-light)' : 'var(--text-muted)' }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="top-materiel__body">
                    <div className="top-materiel__name">{materiel.nom}</div>
                    <div className="progress">
                      <div
                        className="progress__bar"
                        style={{
                          width: `${Math.max(materiel.tauxUtilisation, 3)}%`,
                          '--tone': index === 0 ? 'var(--cyan)' : 'var(--violet)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="top-materiel__value">
                    <strong>{formatNumber(materiel.sorties)}</strong>
                    sorties · {materiel.tauxUtilisation}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 10 }}>Aucune sortie enregistrée sur cette période.</p>
          )}
        </div>

        <div className="glass-card chart-card">
          <div className="chart-card__head">
            <div>
              <div className="chart-card__title">
                <AlertTriangle size={14} className="text-danger" />
                Litiges & causes de pannes SAV
              </div>
              <p className="chart-card__subtitle">Répartition des incidents qualifiés</p>
            </div>
            <span className="badge badge--danger">
              <span className="badge__dot" />
              {formatPercent(incidentRate, 1)}
            </span>
          </div>

          <div className="incident-layout">
            <div className="incident-donut">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={repartitionIncidents}
                    dataKey="valeur"
                    nameKey="nom"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {repartitionIncidents.map((item) => (
                      <Cell key={item.nom} fill={item.couleur} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span className="donut-center__value">{incidents.length}</span>
                <span className="donut-center__label">cas qualifiés</span>
              </div>
            </div>

            <div className="incident-legend">
              {repartitionIncidents.map((item) => (
                <div className="incident-legend__item" key={item.nom}>
                  <span className="incident-legend__dot" style={{ background: item.couleur }} />
                  <span>{item.nom}</span>
                  <strong>{item.valeur}%</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="insight-strip" style={{ marginTop: 8 }}>
            <span className="insight-strip__icon">
              <ShieldCheck size={12} />
            </span>
            <span>
              <strong>{stats.endommages.length}</strong> référence(s) endommagée(s) ou incomplète(s) à traiter par le SAV.
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="card-head">
          <div>
            <div className="card-head__title">
              <FileText size={14} />
              Derniers rapports générés
            </div>
            <p className="card-head__subtitle">
              Livrables d’audit technique, financier et réglementaire · {activePeriod.label.toLowerCase()}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={openPlan}>
            <CalendarClock size={13} />
            Planifier un export
          </button>
        </div>

        <DataTable
          columns={columns}
          rows={filteredRapports}
          pagination={false}
          minWidth="620px"
          emptyTitle="Aucun rapport sur la période"
          emptyText="Générez un nouveau bilan ou élargissez la période d’analyse."
          emptyIcon={<FileText size={22} />}
          footer={
            <span>
              Tous les exports sont horodatés et rattachés au nœud <strong>PROD-FR01</strong>.
            </span>
          }
        />
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Planifier un rapport"
        subtitle="Ajoutez un livrable à l’historique des exports et bilans."
        icon={<CalendarClock size={16} />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button type="submit" form="rapport-form" className="btn btn-primary">
              <FileText size={14} />
              Créer le rapport
            </button>
          </>
        }
      >
        <form id="rapport-form" className="form" onSubmit={submit}>
          <Field label="Titre du rapport" htmlFor="rap-titre" required error={errors.titre} className="span-full">
            <input
              id="rap-titre"
              type="text"
              value={draft.titre}
              onChange={(event) => setDraft((current) => ({ ...current, titre: event.target.value }))}
              placeholder="Ex. Bilan d’utilisation des projecteurs — T4 2026"
              autoFocus
            />
          </Field>
          <div className="form-grid">
            <Field label="Type" htmlFor="rap-type">
              <select
                id="rap-type"
                value={draft.type}
                onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Format" htmlFor="rap-format">
              <select
                id="rap-format"
                value={draft.format}
                onChange={(event) => setDraft((current) => ({ ...current, format: event.target.value }))}
              >
                {REPORT_FORMATS.map((format) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </Field>
            <Field label="Date de génération" htmlFor="rap-date" required error={errors.date}>
              <input
                id="rap-date"
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              />
            </Field>
          </div>
          <div className="insight-strip">
            <span className="insight-strip__icon">
              <Sparkles size={12} />
            </span>
            <span>Le rapport sera visible dans l’historique et pourra être téléchargé depuis la table.</span>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Rapports
