import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Info,
  Package,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import StatCard from '../components/common/StatCard'
import StatusBadge from '../components/common/StatusBadge'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { fluxSemaine } from '../data/rapports'
import {
  computeDashboardStats,
  computeEmpruntResume,
  getAlertesOperationnelles,
  getProchainesReservations,
  getRetoursEnAttente,
} from '../services/stockService'
import {
  formatCurrency,
  formatDateLong,
  formatDateShort,
  formatNumber,
  periodLabel,
  todayISO,
} from '../utils/format'

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

const Dashboard = () => {
  const {
    materiels,
    categories,
    evenements,
    emprunts,
    utilisateurs,
    reservations,
    parametres,
  } = useData()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)

  const stats = useMemo(
    () =>
      computeDashboardStats({
        materiels,
        emprunts,
        evenements,
        reservations,
        categories,
      }),
    [categories, emprunts, evenements, materiels, reservations],
  )

  const recentLoans = useMemo(() => getRetoursEnAttente(emprunts).slice(0, 4), [emprunts])
  const upcoming = useMemo(() => getProchainesReservations(reservations, 3), [reservations])
  const alerts = useMemo(
    () =>
      getAlertesOperationnelles({
        materiels,
        emprunts,
        seuil: parametres?.stock?.seuilAlerte || 25,
      }).slice(0, 4),
    [emprunts, materiels, parametres],
  )
  const donutData = useMemo(
    () => [...stats.repartitionCategories].sort((a, b) => b.valeur - a.valeur).slice(0, 6),
    [stats.repartitionCategories],
  )
  const nextEvent = useMemo(() => {
    const list = evenements
      .filter((evenement) => evenement.statut === 'Planifié' || evenement.statut === 'En cours')
      .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))
    return list[0]
  }, [evenements])

  const totalSorties = fluxSemaine.reduce((sum, day) => sum + day.sorties, 0)
  const totalRetours = fluxSemaine.reduce((sum, day) => sum + day.retours, 0)
  const peak = fluxSemaine.reduce((best, day) => (day.sorties > best.sorties ? day : best), fluxSemaine[0])

  const weekNumber = (() => {
    const date = new Date()
    const start = new Date(date.getFullYear(), 0, 1)
    return Math.ceil(((date - start) / 86400000 + start.getDay() + 1) / 7)
  })()

  const refresh = () => {
    setRefreshing(true)
    window.setTimeout(() => {
      setRefreshing(false)
      pushToast({
        title: 'Statistiques actualisées',
        message: 'Les indicateurs du parc ont été resynchronisés.',
      })
    }, 650)
  }

  const getUser = (id) => utilisateurs.find((item) => item.id === id)
  const getEvent = (id) => evenements.find((item) => item.id === id)

  return (
    <div className="page">
      <PageHeader
        eyebrow="Supervision temps réel"
        title="Tableau de bord"
        subtitle="Vue d’ensemble du parc matériel, des mouvements et de la charge opérationnelle."
        meta={
          <>
            <span className="live-pill">
              <span className="live-pill__dot" />
              LIVE
            </span>
            <span>{formatDateShort(todayISO())}</span>
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={refresh} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'spin' : undefined} />
              Actualiser
            </button>
            <Link to="/rapports" className="btn btn-primary">
              <TrendingUp size={14} />
              Voir les rapports
            </Link>
          </>
        }
      />

      <div className="context-banner">
        <div className="context-banner__main">
          <div className="context-banner__icon">
            <CalendarClock size={20} />
          </div>
          <div>
            <div className="context-banner__title">
              Briefing opérationnel
              <span className="badge badge--cyan">
                <span className="badge__dot" />
                S{weekNumber}
              </span>
            </div>
            <p className="context-banner__text">
              {formatDateLong(todayISO())} · {stats.empruntsActifs} sorties actives ·{' '}
              {stats.retards} retour(s) en retard
            </p>
          </div>
        </div>
        <div className="context-banner__actions">
          <span className="date-chip">
            <CalendarDays size={12} />
            {nextEvent ? `Prochain : ${nextEvent.nom}` : 'Aucun événement planifié'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/reservations')}>
            Planning
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-kpi">
        <StatCard
          icon={<Boxes size={18} />}
          label="Parc total"
          value={formatNumber(stats.total)}
          unit="unités"
          trend={`${stats.referencesMateriels} réf.`}
          trendDirection="flat"
          foot={`Valeur estimée ${formatCurrency(stats.valeurParc)}`}
          tone="var(--violet-light)"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Disponibles"
          value={formatNumber(stats.disponibles)}
          unit="en dépôt"
          trend={`${stats.tauxDisponibilite}%`}
          foot="Prêts pour expédition"
          tone="var(--success)"
        />
        <StatCard
          icon={<ArrowRight size={18} />}
          label="Empruntés"
          value={formatNumber(stats.empruntes)}
          unit="déployés"
          trend={`${stats.tauxEmprunt}%`}
          foot={`${stats.empruntsActifs} bons de sortie actifs`}
          tone="var(--cyan)"
        />
        <StatCard
          icon={<Wrench size={18} />}
          label="Endommagés"
          value={formatNumber(stats.endommages)}
          unit="en atelier"
          trend={stats.endommages > 0 ? 'SAV' : 'OK'}
          trendDirection={stats.endommages > 0 ? 'down' : 'up'}
          foot={`${stats.tauxEndommagement}% du parc immobilisé`}
          tone="var(--danger)"
        />
        <StatCard
          icon={<CalendarDays size={18} />}
          label="Événements à venir"
          value={formatNumber(stats.evenementsAVenir)}
          unit="dates"
          trend={`${stats.reservationsAVenir} rés.`}
          foot={nextEvent ? nextEvent.nom : 'Planning à alimenter'}
          tone="var(--warning)"
        />
      </div>

      <div className="dashboard-analytics">
        <div className="glass-card chart-card">
          <div className="chart-card__head">
            <div>
              <div className="chart-card__title">
                <Sparkles size={14} className="text-cyan" />
                Flux de la semaine
              </div>
              <p className="chart-card__subtitle">Sorties et retours enregistrés sur les 7 derniers jours</p>
            </div>
            <div className="chart-legend">
              <span className="chart-legend__item">
                <span className="chart-legend__dot" style={{ '--tone': 'var(--violet-light)' }} />
                Sorties
              </span>
              <span className="chart-legend__item">
                <span className="chart-legend__dot" style={{ '--tone': 'var(--cyan)' }} />
                Retours
              </span>
            </div>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fluxSemaine} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSorties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8054D8" stopOpacity={0.44} />
                    <stop offset="100%" stopColor="#8054D8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradRetours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#27D9E8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#27D9E8" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(170,182,204,0.09)" vertical={false} />
                <XAxis
                  dataKey="jour"
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
                  dataKey="sorties"
                  name="Sorties"
                  stroke="#A47BF5"
                  strokeWidth={2}
                  fill="url(#gradSorties)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="retours"
                  name="Retours"
                  stroke="#27D9E8"
                  strokeWidth={2}
                  fill="url(#gradRetours)"
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
              Pic de sorties le <strong>{peak.jour}</strong> avec <strong>{peak.sorties}</strong> unités ·
              Ratio retours/sorties de <strong>{Math.round((totalRetours / totalSorties) * 100)}%</strong>
            </span>
          </div>
        </div>

        <div className="glass-card chart-card">
          <div className="chart-card__head">
            <div>
              <div className="chart-card__title">
                <Boxes size={14} className="text-violet" />
                Répartition du parc
              </div>
              <p className="chart-card__subtitle">Unités par famille de matériel</p>
            </div>
            <span className="badge badge--violet">
              <span className="badge__dot" />
              {categories.length} familles
            </span>
          </div>

          <div className="donut-layout">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="valeur"
                    nameKey="nom"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {donutData.map((item) => (
                      <Cell key={item.nom} fill={item.couleur} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span className="donut-center__value">{formatNumber(stats.total)}</span>
                <span className="donut-center__label">unités totales</span>
                <span className="donut-center__sub">{stats.referencesMateriels} références</span>
              </div>
            </div>

            <div className="donut-legend">
              {donutData.map((item) => (
                <div className="donut-legend__item" key={item.nom}>
                  <span className="dot" style={{ background: item.couleur }} />
                  <span className="donut-legend__name">{item.nom}</span>
                  <span className="donut-legend__value">
                    {formatNumber(item.valeur)}
                    <span>{item.pourcentage}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="quick-inline">
            <span>Catégories synchronisées avec l’inventaire</span>
            <Link to="/categories" className="quick-inline__link">
              Gérer
              <ChevronRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      <div className="dashboard-lower">
        <div className="glass-card dash-table">
          <div className="card-head">
            <div>
              <div className="card-head__title">
                <Package size={14} className="text-cyan" />
                Emprunts récents
              </div>
              <p className="card-head__subtitle">Sorties en cours et retours attendus</p>
            </div>
            <Link to="/emprunts" className="btn btn-ghost btn-sm">
              Voir tout
              <ChevronRight size={12} />
            </Link>
          </div>

          <div className="table-scroll">
            <table className="data-table" style={{ minWidth: 0 }}>
              <thead>
                <tr>
                  <th>Matériel</th>
                  <th>Affectation</th>
                  <th>Retour</th>
                  <th className="text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentLoans.map((emprunt) => {
                  const resume = computeEmpruntResume(emprunt, materiels)
                  const firstMateriel = materiels.find((item) => item.id === emprunt.lignes[0]?.materielId)
                  const user = getUser(emprunteurIdOf(emprunt))
                  const event = getEvent(emprunt.evenementId)
                  return (
                    <tr key={emprunt.id}>
                      <td>
                        <div className="table-entity">
                          <span className="table-thumb table-thumb--sm">
                            <Package size={14} />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-main">{firstMateriel?.nom || 'Matériel'}</div>
                            <div className="cell-sub">
                              {resume.quantite} unité(s) · {emprunt.reference}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-main">{user?.nom || '—'}</div>
                        <div className="cell-sub">{event?.nom || 'Sans événement'}</div>
                      </td>
                      <td>
                        <span className="cell-mono">{formatDateShort(emprunt.dateRetourPrevue)}</span>
                      </td>
                      <td className="text-right">
                        <StatusBadge status={emprunt.statut} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="quick-inline">
            <span>{stats.retoursEnAttente} bons de sortie suivis</span>
            <Link to="/retours" className="quick-inline__link">
              Enregistrer un retour
              <ChevronRight size={11} />
            </Link>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-head">
            <div>
              <div className="card-head__title">
                <CalendarDays size={14} className="text-violet" />
                Sorties prévues
              </div>
              <p className="card-head__subtitle">Prochaines réservations confirmées</p>
            </div>
          </div>

          <div className="timeline">
            {upcoming.map((reservation) => (
              <div className="timeline__item" key={reservation.id}>
                <div className="timeline__marker" style={{ '--tone': 'var(--violet-light)' }}>
                  {formatDateShort(reservation.dateDebut).split(' ')[0]}
                </div>
                <div className="timeline__body">
                  <div className="timeline__title">{reservation.evenementNom}</div>
                  <div className="timeline__meta">
                    <span>{reservation.client}</span>
                    <span>·</span>
                    <span>{periodLabel(reservation.dateDebut, reservation.dateFin)}</span>
                  </div>
                </div>
                <div className="timeline__right">
                  <StatusBadge status={reservation.statut} />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm timeline-cta"
            onClick={() => navigate('/reservations')}
          >
            Ouvrir le planning
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="glass-card dash-alerts">
          <div className="card-head">
            <div>
              <div className="card-head__title">
                <TriangleAlert size={14} className="text-warning" />
                Alertes
              </div>
              <p className="card-head__subtitle">Points de vigilance opérationnels</p>
            </div>
            <span className="badge badge--warning">{alerts.length}</span>
          </div>

          {alerts.length ? (
            alerts.map((alert) => (
              <div
                className="alert-item"
                key={alert.id}
                style={{ '--tone': alert.niveau === 'critique' ? 'var(--danger)' : 'var(--warning)' }}
              >
                <CircleAlert size={14} className="alert-item__icon" />
                <div>
                  <div className="alert-item__title">{alert.titre}</div>
                  <div className="alert-item__text">{alert.message}</div>
                  <Link to={alert.lien} className="alert-item__action">
                    Traiter
                    <ChevronRight size={10} />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="insight-strip">
              <span className="insight-strip__icon">
                <Info size={12} />
              </span>
              <span>Parc sous contrôle : aucune alerte active.</span>
            </div>
          )}

          <div className="quick-inline">
            <span>Seuil d’alerte {parametres?.stock?.seuilAlerte || 25}%</span>
            <Link to="/materiels" className="quick-inline__link">
              Inventaire
              <ChevronRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      <footer className="page-footer">
        <span>EVENT MANAGER · Logistics Core</span>
        <span>Dernière synchronisation {formatDateShort(todayISO())} · Données locales</span>
      </footer>
    </div>
  )
}

const emprunteurIdOf = (emprunt) => emprunt.emprunteurId

export default Dashboard
