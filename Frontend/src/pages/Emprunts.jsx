import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Eye,
  Package,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import DataTable from '../components/common/DataTable'
import Field from '../components/common/Field'
import FilterSelect from '../components/common/FilterSelect'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import SearchBar from '../components/common/SearchBar'
import StatusBadge from '../components/common/StatusBadge'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useDebounce } from '../hooks/useDebounce'
import {
  computeEmpruntResume,
  getEmpruntsActifs,
  getEmpruntsEnRetard,
  getLignesRestantes,
  getStatutEmpruntCalcule,
} from '../services/stockService'
import { PAGE_SIZE, STATUTS_EMPRUNT } from '../utils/constants'
import { daysUntil, formatDate, formatDateShort, formatNumber, periodLabel, todayISO } from '../utils/format'

const addDays = (iso, days) => {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const buildEmptyDraft = (evenementId = '') => ({
  emprunteurId: '',
  evenementId,
  dateEmprunt: todayISO(),
  dateRetourPrevue: addDays(todayISO(), 3),
  notes: '',
  lignes: [],
})

const Emprunts = () => {
  const {
    emprunts,
    materiels,
    utilisateurs,
    evenements,
    retours,
    createEmprunt,
    updateEmprunt,
  } = useData()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [statut, setStatut] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const debounced = useDebounce(query, 200)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(buildEmptyDraft())
  const [newMaterielId, setNewMaterielId] = useState('')
  const [errors, setErrors] = useState({})
  const [detail, setDetail] = useState(null)

  const withStatus = useMemo(
    () => emprunts.map((emprunt) => ({ ...emprunt, statutCalcule: getStatutEmpruntCalcule(emprunt) })),
    [emprunts],
  )

  const stats = useMemo(() => {
    const actifs = getEmpruntsActifs(emprunts)
    return {
      actifs: actifs.length,
      retards: getEmpruntsEnRetard(emprunts).length,
      bientot: actifs.filter((emprunt) => daysUntil(emprunt.dateRetourPrevue) >= 0 && daysUntil(emprunt.dateRetourPrevue) <= 7).length,
      unites: actifs.reduce(
        (sum, emprunt) => sum + emprunt.lignes.reduce((lineSum, ligne) => lineSum + ligne.quantite, 0),
        0,
      ),
      retournes: emprunts.filter((emprunt) => emprunt.statut === 'Retourné').length,
    }
  }, [emprunts])

  const tabCounts = useMemo(
    () => ({
      all: emprunts.length,
      'En cours': withStatus.filter((item) => item.statutCalcule === 'En cours').length,
      Prolongé: withStatus.filter((item) => item.statutCalcule === 'Prolongé').length,
      'En retard': withStatus.filter((item) => item.statutCalcule === 'En retard').length,
      Retourné: withStatus.filter((item) => item.statutCalcule === 'Retourné').length,
    }),
    [emprunts, withStatus],
  )

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase()
    return withStatus.filter((emprunt) => {
      if (statut && emprunt.statutCalcule !== statut) return false
      if (activeTab !== 'all' && emprunt.statutCalcule !== activeTab) return false
      if (!term) return true
      const user = utilisateurs.find((item) => item.id === emprunt.emprunteurId)
      const event = evenements.find((item) => item.id === emprunt.evenementId)
      const noms = emprunt.lignes
        .map((ligne) => materiels.find((item) => item.id === ligne.materielId)?.nom || '')
        .join(' ')
      return [emprunt.reference, user?.nom, event?.nom, noms]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    })
  }, [activeTab, debounced, emprunts, evenements, materiels, statut, utilisateurs, withStatus])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      const evenementId = searchParams.get('evenement') || ''
      const prefillEvent = evenements.find((item) => item.id === evenementId)
      setEditing(null)
      setDraft({
        ...buildEmptyDraft(evenementId),
        emprunteurId: prefillEvent?.responsableId || utilisateurs[0]?.id || '',
      })
      setNewMaterielId('')
      setErrors({})
      setFormOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      next.delete('evenement')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditing(null)
    setDraft({ ...buildEmptyDraft(), emprunteurId: utilisateurs[0]?.id || '' })
    setNewMaterielId('')
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (emprunt) => {
    if (emprunt.statut === 'Retourné') {
      pushToast({ title: 'Édition impossible', message: 'Un bon clôturé ne peut plus être modifié.', type: 'warning' })
      return
    }
    setEditing(emprunt)
    setDraft({
      emprunteurId: emprunt.emprunteurId,
      evenementId: emprunt.evenementId || '',
      dateEmprunt: emprunt.dateEmprunt,
      dateRetourPrevue: emprunt.dateRetourPrevue,
      notes: emprunt.notes || '',
      lignes: emprunt.lignes.map((ligne) => ({ ...ligne })),
    })
    setNewMaterielId('')
    setErrors({})
    setFormOpen(true)
  }

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const availableFor = (materielId) => {
    const materiel = materiels.find((item) => item.id === materielId)
    if (!materiel) return 0
    const own = editing?.lignes.find((ligne) => ligne.materielId === materielId)?.quantite || 0
    return materiel.quantiteDisponible + own
  }

  const addLine = () => {
    if (!newMaterielId) return
    if (draft.lignes.some((ligne) => ligne.materielId === newMaterielId)) {
      pushToast({ title: 'Déjà ajouté', message: 'Ce matériel figure déjà sur le bon de sortie.', type: 'warning' })
      return
    }
    setDraft((current) => ({
      ...current,
      lignes: [...current.lignes, { materielId: newMaterielId, quantite: 1 }],
    }))
    setNewMaterielId('')
  }

  const updateLine = (materielId, quantite) =>
    setDraft((current) => ({
      ...current,
      lignes: current.lignes.map((ligne) =>
        ligne.materielId === materielId ? { ...ligne, quantite } : ligne,
      ),
    }))

  const removeLine = (materielId) =>
    setDraft((current) => ({
      ...current,
      lignes: current.lignes.filter((ligne) => ligne.materielId !== materielId),
    }))

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!draft.emprunteurId) next.emprunteurId = 'Sélectionnez un emprunteur.'
    if (!draft.dateEmprunt) next.dateEmprunt = 'Renseignez la date de sortie.'
    if (!draft.dateRetourPrevue) next.dateRetourPrevue = 'Renseignez la date de retour.'
    if (
      draft.dateEmprunt &&
      draft.dateRetourPrevue &&
      new Date(draft.dateRetourPrevue) < new Date(draft.dateEmprunt)
    ) {
      next.dateRetourPrevue = 'La date de retour doit suivre la date de sortie.'
    }
    if (!draft.lignes.length) next.lignes = 'Ajoutez au moins un matériel au bon de sortie.'
    draft.lignes.forEach((ligne) => {
      const max = availableFor(ligne.materielId)
      if (Number(ligne.quantite) <= 0) next.lignes = 'Les quantités doivent être supérieures à 0.'
      else if (Number(ligne.quantite) > max) {
        const nom = materiels.find((item) => item.id === ligne.materielId)?.nom
        next.lignes = `Stock insuffisant pour ${nom} : ${max} maximum.`
      }
    })
    setErrors(next)
    if (Object.keys(next).length) return

    const payload = {
      ...draft,
      lignes: draft.lignes.map((ligne) => ({
        materielId: ligne.materielId,
        quantite: Number(ligne.quantite),
      })),
      notes: draft.notes.trim(),
    }

    const result = editing ? updateEmprunt(editing.id, payload) : createEmprunt(payload)
    if (!result.ok) {
      pushToast({ title: 'Enregistrement impossible', message: result.message, type: 'error' })
      return
    }

    if (editing) {
      pushToast({ title: 'Emprunt mis à jour', message: 'Le bon de sortie a été actualisé.' })
    } else {
      pushToast({
        title: 'Emprunt créé',
        message: `${result.emprunt.reference} · ${payload.lignes.length} référence(s) sorties du stock.`,
      })
    }
    setFormOpen(false)
  }

  const totalUnits = draft.lignes.reduce((sum, ligne) => sum + Number(ligne.quantite || 0), 0)
  const detailsLignes = detail
    ? detail.lignes.map((ligne) => ({
        ...ligne,
        materiel: materiels.find((item) => item.id === ligne.materielId),
        restante: getLignesRestantes(detail, retours).find((item) => item.materielId === ligne.materielId)
          ?.quantiteRestante || 0,
      }))
    : []

  const columns = [
    {
      key: 'reference',
      label: 'Bon de sortie',
      render: (row) => (
        <div className="table-entity">
          <span className="table-thumb table-thumb--sm" style={{ '--thumb-tone': row.statutCalcule === 'En retard' ? 'var(--danger)' : 'var(--violet-light)' }}>
            <ArrowUpRight size={14} />
          </span>
          <div>
            <div className="cell-main mono">{row.reference}</div>
            <div className="cell-sub">{formatDate(row.dateEmprunt)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'emprunteur',
      label: 'Emprunteur / Événement',
      render: (row) => {
        const user = utilisateurs.find((item) => item.id === row.emprunteurId)
        const event = evenements.find((item) => item.id === row.evenementId)
        return (
          <div>
            <div className="cell-main">{user?.nom || 'Emprunteur inconnu'}</div>
            <div className="cell-sub">{event?.nom || 'Sans événement'}</div>
          </div>
        )
      },
    },
    {
      key: 'materiel',
      label: 'Matériel',
      render: (row) => {
        const resume = computeEmpruntResume(row, materiels)
        return (
          <div className="materiel-name-cell">
            <div className="cell-main">{row.lignes.length} référence(s)</div>
            <div className="cell-sub">{resume.quantite} unités · {resume.noms}</div>
          </div>
        )
      },
    },
    {
      key: 'retour',
      label: 'Retour prévu',
      render: (row) => {
        const days = daysUntil(row.dateRetourPrevue)
        return (
          <div>
            <div className="cell-mono">{formatDateShort(row.dateRetourPrevue)}</div>
            <div className="cell-sub" style={{ color: days < 0 ? 'var(--danger)' : undefined }}>
              {row.dateRetourReelle
                ? `Restitué le ${formatDateShort(row.dateRetourReelle)}`
                : days < 0
                  ? `${Math.abs(days)} j de retard`
                  : `Dans ${days} jour(s)`}
            </div>
          </div>
        )
      },
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (row) => <StatusBadge status={row.statutCalcule} />,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <div className="table-actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="btn-icon is-cyan" onClick={() => setDetail(row)} aria-label="Voir">
            <Eye size={14} />
          </button>
          {row.statutCalcule !== 'Retourné' && (
            <>
              <button type="button" className="btn-icon is-violet" onClick={() => openEdit(row)} aria-label="Modifier">
                <Pencil size={14} />
              </button>
              <Link to={`/retours?emprunt=${row.id}`} className="btn-icon is-cyan" aria-label="Retour">
                <CheckCircle2 size={14} />
              </Link>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="Mouvements de matériel"
        title="Emprunts"
        subtitle="Suivez les bons de sortie, les échéances de restitution et les engagements du parc."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Nouvel emprunt
          </button>
        }
      />

      <div className="metrics-strip">
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--violet-light)' }}>
            <ArrowUpRight size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Bons actifs</div>
            <div className="metrics-strip__value">{formatNumber(stats.actifs)}</div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--danger)' }}>
            <TriangleAlert size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">En retard</div>
            <div className="metrics-strip__value">{formatNumber(stats.retards)}</div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--warning)' }}>
            <Clock size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Sous 7 jours</div>
            <div className="metrics-strip__value">{formatNumber(stats.bientot)}</div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--cyan)' }}>
            <Package size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Unités déployées</div>
            <div className="metrics-strip__value">{formatNumber(stats.unites)}</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Rechercher un bon, un emprunteur, un événement…"
            ariaLabel="Rechercher un emprunt"
          />
        </div>
        <div className="toolbar__group">
          <FilterSelect
            value={statut}
            onChange={setStatut}
            label="Statut"
            allLabel="Tous les statuts"
            options={STATUTS_EMPRUNT}
          />
          <span className="toolbar__count">{filtered.length} bon(s)</span>
        </div>
      </div>

      <div className="filter-pills">
        {[
          { key: 'all', label: 'Tous' },
          ...STATUTS_EMPRUNT.map((item) => ({ key: item, label: item })),
        ].map((item) => (
          <button
            type="button"
            key={item.key}
            className={`pill ${activeTab === item.key ? 'is-active' : ''}`.trim()}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
            <span className="pill__count">{tabCounts[item.key] || 0}</span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={PAGE_SIZE}
        onRowClick={(row) => setDetail(row)}
        emptyTitle="Aucun emprunt"
        emptyText="Aucun bon ne correspond aux filtres sélectionnés."
        emptyIcon={<ArrowUpRight size={22} />}
        emptyAction={
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <CalendarPlus size={14} />
            Créer un emprunt
          </button>
        }
        minWidth="820px"
        footer={<span>{filtered.length} bon(s) · {formatNumber(stats.unites)} unités actuellement sorties</span>}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier le bon de sortie' : 'Nouvel emprunt'}
        subtitle={editing ? `${editing.reference} · ajustez le matériel et les dates` : 'Le stock disponible est décrémenté automatiquement.'}
        icon={<ArrowUpRight size={16} />}
        size="lg"
        footer={
          <>
            <span className="field__hint" style={{ marginRight: 'auto' }}>
              {draft.lignes.length} référence(s) · {totalUnits} unité(s)
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button type="submit" form="emprunt-form" className="btn btn-primary">
              {editing ? 'Enregistrer' : 'Valider la sortie'}
            </button>
          </>
        }
      >
        <form id="emprunt-form" className="form" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Emprunteur" htmlFor="emp-user" required error={errors.emprunteurId}>
              <select
                id="emp-user"
                value={draft.emprunteurId}
                onChange={(event) => setField('emprunteurId', event.target.value)}
              >
                <option value="">Sélectionner…</option>
                {utilisateurs
                  .filter((item) => item.statut !== 'Suspendu')
                  .map((item) => (
                    <option key={item.id} value={item.id}>{item.nom} · {item.role}</option>
                  ))}
              </select>
            </Field>
            <Field label="Événement associé" htmlFor="emp-event">
              <select
                id="emp-event"
                value={draft.evenementId}
                onChange={(event) => setField('evenementId', event.target.value)}
              >
                <option value="">Sans événement</option>
                {evenements
                  .filter((item) => item.statut !== 'Annulé')
                  .map((item) => (
                    <option key={item.id} value={item.id}>{item.nom}</option>
                  ))}
              </select>
            </Field>
            <Field label="Date de sortie" htmlFor="emp-debut" required error={errors.dateEmprunt}>
              <input
                id="emp-debut"
                type="date"
                value={draft.dateEmprunt}
                onChange={(event) => setField('dateEmprunt', event.target.value)}
              />
            </Field>
            <Field label="Retour prévu" htmlFor="emp-fin" required error={errors.dateRetourPrevue}>
              <input
                id="emp-fin"
                type="date"
                value={draft.dateRetourPrevue}
                onChange={(event) => setField('dateRetourPrevue', event.target.value)}
              />
            </Field>
          </div>

          <div className="form-section">
            <div className="form-section__head">
              <span className="form-section__num">02</span>
              <div>
                <div className="form-section__title">Matériel du bon de sortie</div>
                <div className="form-section__hint">Seules les quantités disponibles peuvent être engagées.</div>
              </div>
            </div>

            <div className="line-editor__add">
              <Field label="Ajouter un matériel" htmlFor="emp-add" className="span-full" error={errors.lignes}>
                <select
                  id="emp-add"
                  value={newMaterielId}
                  onChange={(event) => setNewMaterielId(event.target.value)}
                >
                  <option value="">Sélectionner un matériel…</option>
                  {materiels
                    .filter((item) => availableFor(item.id) > 0)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nom} · {availableFor(item.id)} dispo
                      </option>
                    ))}
                </select>
              </Field>
              <button type="button" className="btn btn-secondary" onClick={addLine} disabled={!newMaterielId}>
                <Plus size={14} />
                Ajouter
              </button>
            </div>

            <div className="lines-editor">
              {draft.lignes.map((ligne) => {
                const materiel = materiels.find((item) => item.id === ligne.materielId)
                if (!materiel) return null
                const max = availableFor(ligne.materielId)
                return (
                  <div className="line-editor" key={ligne.materielId}>
                    <div className="line-editor__info">
                      <div className="line-editor__name">{materiel.nom}</div>
                      <div className="line-editor__meta">
                        {materiel.reference} · max {max}
                      </div>
                    </div>
                    <input
                      className="line-editor__qty"
                      type="number"
                      min="1"
                      max={max}
                      value={ligne.quantite}
                      onChange={(event) => updateLine(ligne.materielId, event.target.value)}
                      aria-label={`Quantité ${materiel.nom}`}
                    />
                    <button
                      type="button"
                      className="line-editor__remove"
                      onClick={() => removeLine(ligne.materielId)}
                      aria-label="Retirer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
              {!draft.lignes.length && (
                <div className="insight-strip">
                  <span className="insight-strip__icon">
                    <Package size={12} />
                  </span>
                  <span>Ajoutez au moins un matériel pour valider la sortie.</span>
                </div>
              )}
            </div>
          </div>

          <Field label="Notes" htmlFor="emp-notes">
            <textarea
              id="emp-notes"
              value={draft.notes}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder="Consignes de chargement, transport, contact sur site…"
            />
          </Field>

          <div className="insight-strip">
            <span className="insight-strip__icon">
              <Clock size={12} />
            </span>
            <span>
              Restitution prévue le <strong>{formatDate(draft.dateRetourPrevue)}</strong> ·{' '}
              {draft.evenementId
                ? evenements.find((item) => item.id === draft.evenementId)?.nom
                : 'Sortie hors événement'}
            </span>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.reference || 'Détail de l’emprunt'}
        subtitle={
          detail
            ? `${utilisateurs.find((item) => item.id === detail.emprunteurId)?.nom || 'Emprunteur'} · ${formatDate(detail.dateEmprunt)}`
            : undefined
        }
        icon={<ArrowUpRight size={16} />}
        variant="drawer"
        footer={
          detail && (
            <>
              <Link to={`/retours?emprunt=${detail.id}`} className="btn btn-secondary">
                <CheckCircle2 size={14} />
                Enregistrer le retour
              </Link>
              <div className="toolbar__spacer" />
              {detail.statut !== 'Retourné' && (
                <button type="button" className="btn btn-primary" onClick={() => openEdit(detail)}>
                  <Pencil size={14} />
                  Modifier
                </button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="form">
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">Statut</div>
                <div className="detail-item__value"><StatusBadge status={detail.statutCalcule || detail.statut} /></div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Emprunteur</div>
                <div className="detail-item__value">
                  {utilisateurs.find((item) => item.id === detail.emprunteurId)?.nom || '—'}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Sortie</div>
                <div className="detail-item__value">{formatDate(detail.dateEmprunt)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Retour prévu</div>
                <div className="detail-item__value">{formatDate(detail.dateRetourPrevue)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Événement</div>
                <div className="detail-item__value">
                  {evenements.find((item) => item.id === detail.evenementId)?.nom || 'Sans événement'}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Période</div>
                <div className="detail-item__value">
                  {periodLabel(detail.dateEmprunt, detail.dateRetourPrevue)}
                </div>
              </div>
              <div className="detail-item detail-item--full">
                <div className="detail-item__label">Notes</div>
                <div className="detail-item__value" style={{ fontWeight: 500 }}>
                  {detail.notes || 'Aucune note.'}
                </div>
              </div>
            </div>

            <div>
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <Package size={13} /> Lignes du bon
                  </div>
                  <p className="card-head__subtitle">
                    {computeEmpruntResume(detail, materiels).quantite} unités au total
                  </p>
                </div>
              </div>
              <div className="detail-list">
                {detailsLignes.map((ligne) => (
                  <div className="detail-list__row" key={ligne.materielId}>
                    <span className="detail-list__label">
                      <Package size={12} />
                      {ligne.materiel?.nom || 'Matériel'}
                    </span>
                    <span className="detail-list__value mono">
                      {ligne.quantite} sortie(s) · {ligne.restante} restante(s)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="divider" />
            <div className="insight-strip">
              <span className="insight-strip__icon">
                <UserRound size={12} />
              </span>
              <span>
                {detail.statutCalcule === 'En retard' || detail.statut === 'En retard'
                  ? `Relance recommandée : échéance dépassée de ${Math.abs(daysUntil(detail.dateRetourPrevue))} jour(s).`
                  : `Restitution dans ${Math.max(0, daysUntil(detail.dateRetourPrevue))} jour(s).`}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Emprunts
