import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Eye,
  MapPin,
  Package,
  Pencil,
  Plus,
  QrCode as QrIcon,
  RadioTower,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import DataTable from '../components/common/DataTable'
import Field from '../components/common/Field'
import FilterSelect from '../components/common/FilterSelect'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import QrCode from '../components/common/QrCode'
import SearchBar from '../components/common/SearchBar'
import StatusBadge from '../components/common/StatusBadge'
import { useConfirm } from '../context/ConfirmContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useDebounce } from '../hooks/useDebounce'
import { formatNumber, periodLabel, todayISO, daysBetween, daysUntil, initials } from '../utils/format'
import { PAGE_SIZE, STATUTS_EVENEMENT, TYPES_EVENEMENT } from '../utils/constants'
import { getIcon } from '../utils/icons'

const TYPE_TONE = {
  Festival: 'var(--violet-light)',
  Concert: 'var(--cyan)',
  Salon: 'var(--blue)',
  Gala: 'var(--warning)',
  Exposition: 'var(--success)',
  Entreprise: '#FF7AA2',
  Privé: '#F4C95D',
}

const emptyDraft = {
  nom: '',
  type: 'Festival',
  dateDebut: todayISO(),
  dateFin: todayISO(),
  lieu: '',
  responsableId: '',
  participants: 0,
  statut: 'Planifié',
  description: '',
  materielIds: [],
}

const Evenements = () => {
  const { evenements, utilisateurs, materiels, emprunts, addEvenement, updateEvenement, deleteEvenement } =
    useData()
  const { pushToast } = useToast()
  const confirm = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [statut, setStatut] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const debounced = useDebounce(query, 200)

  const [selectedId, setSelectedId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [errors, setErrors] = useState({})
  const [detail, setDetail] = useState(null)

  const stats = useMemo(
    () => ({
      total: evenements.length,
      planifies: evenements.filter((item) => item.statut === 'Planifié').length,
      enCours: evenements.filter((item) => item.statut === 'En cours').length,
      participants: evenements
        .filter((item) => item.statut !== 'Annulé')
        .reduce((sum, item) => sum + Number(item.participants || 0), 0),
    }),
    [evenements],
  )

  const tabCounts = useMemo(
    () => ({
      all: evenements.length,
      Planifié: evenements.filter((item) => item.statut === 'Planifié').length,
      'En cours': evenements.filter((item) => item.statut === 'En cours').length,
      Terminé: evenements.filter((item) => item.statut === 'Terminé').length,
      Annulé: evenements.filter((item) => item.statut === 'Annulé').length,
    }),
    [evenements],
  )

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase()
    return [...evenements]
      .filter((evenement) => {
        if (statut && evenement.statut !== statut) return false
        if (activeTab !== 'all' && evenement.statut !== activeTab) return false
        if (!term) return true
        return [evenement.nom, evenement.lieu, evenement.type, evenement.responsable]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term))
      })
      .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))
  }, [activeTab, debounced, evenements, statut])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null)
      setDraft({ ...emptyDraft, responsableId: utilisateurs[0]?.id || '' })
      setErrors({})
      setFormOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null)
      return
    }
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const selected = evenements.find((item) => item.id === selectedId) || null
  const selectedMateriels = selected
    ? selected.materielIds
        .map((id) => materiels.find((item) => item.id === id))
        .filter(Boolean)
    : []
  const selectedResponsable = selected
    ? utilisateurs.find((item) => item.id === selected.responsableId)
    : null
  const selectedLoans = selected
    ? emprunts.filter((emprunt) => emprunt.evenementId === selected.id && emprunt.statut !== 'Retourné')
    : []

  const openCreate = () => {
    setEditing(null)
    setDraft({ ...emptyDraft, responsableId: utilisateurs[0]?.id || '' })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (evenement) => {
    setEditing(evenement)
    setDraft({
      nom: evenement.nom,
      type: evenement.type,
      dateDebut: evenement.dateDebut,
      dateFin: evenement.dateFin,
      lieu: evenement.lieu,
      responsableId: evenement.responsableId || utilisateurs[0]?.id || '',
      participants: evenement.participants || 0,
      statut: evenement.statut,
      description: evenement.description || '',
      materielIds: [...evenement.materielIds],
    })
    setErrors({})
    setFormOpen(true)
  }

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const toggleMateriel = (id) =>
    setDraft((current) => ({
      ...current,
      materielIds: current.materielIds.includes(id)
        ? current.materielIds.filter((item) => item !== id)
        : [...current.materielIds, id],
    }))

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!draft.nom.trim()) next.nom = 'Le nom de l’événement est requis.'
    if (!draft.lieu.trim()) next.lieu = 'Le lieu est requis.'
    if (!draft.dateDebut) next.dateDebut = 'Renseignez la date de début.'
    if (!draft.dateFin) next.dateFin = 'Renseignez la date de fin.'
    if (draft.dateDebut && draft.dateFin && new Date(draft.dateFin) < new Date(draft.dateDebut)) {
      next.dateFin = 'La date de fin doit suivre la date de début.'
    }
    if (!draft.responsableId) next.responsableId = 'Sélectionnez un responsable.'
    setErrors(next)
    if (Object.keys(next).length) return

    const responsable = utilisateurs.find((item) => item.id === draft.responsableId)
    const payload = {
      ...draft,
      nom: draft.nom.trim(),
      lieu: draft.lieu.trim(),
      description: draft.description.trim(),
      participants: Number(draft.participants) || 0,
      responsable: responsable?.nom || '',
    }

    const result = editing ? await updateEvenement(editing.id, payload) : await addEvenement(payload)
    if (result?.ok === false) {
      pushToast({ title: 'Enregistrement impossible', message: result.message, type: 'error' })
      return
    }
    if (editing) {
      pushToast({ title: 'Événement mis à jour', message: `${payload.nom} a été enregistré.` })
    } else {
      pushToast({ title: 'Événement créé', message: `${payload.nom} est ajouté au planning.` })
    }
    setFormOpen(false)
  }

  const remove = async (evenement) => {
    const ok = await confirm({
      title: 'Supprimer cet événement ?',
      message: `${evenement.nom} sera retiré du planning. Les emprunts et réservations liés doivent être clôturés au préalable.`,
      confirmLabel: 'Supprimer',
    })
    if (!ok) return
    const result = await deleteEvenement(evenement.id)
    if (!result?.ok) {
      pushToast({ title: 'Suppression impossible', message: result?.message, type: 'error' })
      return
    }
    setDetail(null)
    pushToast({ title: 'Événement supprimé', message: `${evenement.nom} a été retiré du planning.` })
  }

  const columns = [
    {
      key: 'nom',
      label: 'Événement',
      render: (row) => {
        const Icon = getIcon(row.type === 'Concert' ? 'speaker' : row.type === 'Festival' ? 'sparkles' : 'calendar')
        return (
          <div className="event-cell">
            <span className="event-type-icon" style={{ '--tone': TYPE_TONE[row.type] || 'var(--violet-light)' }}>
              <Icon size={15} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="cell-main">{row.nom}</div>
              <div className="cell-sub">{row.type} · {formatNumber(row.participants)} pers.</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'dates',
      label: 'Période',
      render: (row) => (
        <div className="event-dates">
          <span className="event-dates__main">{periodLabel(row.dateDebut, row.dateFin)}</span>
          <span className="cell-sub">
            {daysBetween(row.dateDebut, row.dateFin) + 1} jour(s) · {todayISO() <= row.dateFin && todayISO() >= row.dateDebut ? 'En cours' : 'Hors exploitation'}
          </span>
        </div>
      ),
    },
    {
      key: 'lieu',
      label: 'Lieu',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
          <MapPin size={12} style={{ marginTop: 2, color: 'var(--cyan)', flexShrink: 0 }} />
          <div>
            <div className="cell-main">{row.lieu}</div>
            <div className="cell-sub">{row.responsable}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'materiel',
      label: 'Matériel',
      render: (row) => (
        <div className="event-materiels">
          {row.materielIds.slice(0, 3).map((id, index) => (
            <span className="materiel-dot" key={id} title={materiels.find((item) => item.id === id)?.nom}>
              {String(index + 1).padStart(2, '0')}
            </span>
          ))}
          {row.materielIds.length > 3 && (
            <span className="materiel-dot">+{row.materielIds.length - 3}</span>
          )}
          {!row.materielIds.length && <span className="cell-sub">Aucun</span>}
        </div>
      ),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (row) => <StatusBadge status={row.statut} />,
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
          <button type="button" className="btn-icon is-violet" onClick={() => openEdit(row)} aria-label="Modifier">
            <Pencil size={14} />
          </button>
          <button type="button" className="btn-icon is-danger" onClick={() => remove(row)} aria-label="Supprimer">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="Planning opérationnel"
        title="Événements"
        subtitle="Coordonnez les dates, les lieux et les moyens matériels de chaque production."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Nouvel événement
          </button>
        }
      />

      <div className="metrics-strip">
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--violet-light)' }}>
            <CalendarDays size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Événements</div>
            <div className="metrics-strip__value">{formatNumber(stats.total)}</div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--cyan)' }}>
            <CalendarPlus size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Planifiés</div>
            <div className="metrics-strip__value">{formatNumber(stats.planifies)}</div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--success)' }}>
            <RadioTower size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">En cours</div>
            <div className="metrics-strip__value">{formatNumber(stats.enCours)}</div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--warning)' }}>
            <Users size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Participants</div>
            <div className="metrics-strip__value">{formatNumber(stats.participants)}</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Rechercher un événement, un lieu, un responsable…"
            ariaLabel="Rechercher un événement"
          />
        </div>
        <div className="toolbar__group">
          <FilterSelect
            value={statut}
            onChange={setStatut}
            label="Statut"
            allLabel="Tous les statuts"
            options={STATUTS_EVENEMENT}
          />
          <span className="toolbar__count">{filtered.length} événement(s)</span>
        </div>
      </div>

      <div className="filter-pills">
        {[
          { key: 'all', label: 'Tous' },
          ...STATUTS_EVENEMENT.map((item) => ({ key: item, label: item })),
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

      <div className="grid-8-4">
        <DataTable
          columns={columns}
          rows={filtered}
          pageSize={PAGE_SIZE}
          onRowClick={(row) => setSelectedId(row.id)}
          emptyTitle="Aucun événement"
          emptyText="Ajustez les filtres ou planifiez une nouvelle production."
          emptyIcon={<CalendarPlus size={22} />}
          emptyAction={
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} />
              Créer un événement
            </button>
          }
          minWidth="760px"
          footer={<span>{filtered.length} événement(s) dans le planning</span>}
        />

        <aside className="dispatch-panel">
          <div className="dispatch-panel__head">
            <div>
              <div className="dispatch-panel__title">Fiche de déploiement</div>
              <div className="dispatch-panel__sub">Sélection active · mise à jour en direct</div>
            </div>
            <span className="live-pill">
              <span className="live-pill__dot" />
              LIVE
            </span>
          </div>

          {selected ? (
            <>
              <div className="dispatch-event">
                <div className="dispatch-event__name">{selected.nom}</div>
                <div className="dispatch-event__meta">
                  <MapPin size={11} /> {selected.lieu}
                </div>
                <div className="dispatch-event__meta">
                  <CalendarDays size={11} /> {periodLabel(selected.dateDebut, selected.dateFin)}
                  <span>·</span>
                  <span>{daysUntil(selected.dateDebut) >= 0 ? `J-${daysUntil(selected.dateDebut)}` : 'En cours'}</span>
                </div>
              </div>

              <div className="dispatch-driver">
                <div className="dispatch-driver__avatar">{initials(selectedResponsable?.nom || selected.responsable)}</div>
                <div>
                  <div className="dispatch-driver__name">{selectedResponsable?.nom || selected.responsable}</div>
                  <div className="dispatch-driver__role">{selectedResponsable?.role || 'Responsable'} · {selected.type}</div>
                </div>
                <span className="dispatch-driver__plate">{selected.id.toUpperCase()}</span>
              </div>

              <div className="qr-block">
                <QrCode value={`${selected.id}-${selected.dateDebut}`} label={`QR ${selected.nom}`} />
                <div style={{ minWidth: 0 }}>
                  <div className="qr-block__label">Code de déploiement</div>
                  <div className="qr-block__value">{selected.nom.slice(0, 22)}</div>
                  <div className="qr-block__hint">Scan régie · accès sécurisé</div>
                </div>
              </div>

              <div>
                <div className="qr-block__label" style={{ marginBottom: 5 }}>
                  Manifeste matériel
                </div>
                <div className="dispatch-manifest">
                  {selectedMateriels.length ? (
                    selectedMateriels.map((materiel) => (
                      <span className="chip" key={materiel.id}>
                        <Package size={10} />
                        {materiel.nom}
                      </span>
                    ))
                  ) : (
                    <span className="cell-sub">Aucun matériel affecté.</span>
                  )}
                </div>
              </div>

              <div className="stage-health">
                <div className="stage-health__row">
                  <span>Matériel mobilisé</span>
                  <span className="stage-health__value">{selectedMateriels.length} / {materiels.length}</span>
                </div>
                <div className="stage-health__row">
                  <span>Bons de sortie actifs</span>
                  <span className="stage-health__value">{selectedLoans.length}</span>
                </div>
                <div className="stage-health__row">
                  <span>Participants</span>
                  <span className="stage-health__value">{formatNumber(selected.participants)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetail(selected)}>
                  <Eye size={13} />
                  Détails
                </button>
                <Link to={`/emprunts?new=1&evenement=${selected.id}`} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  <QrIcon size={13} />
                  Préparer la sortie
                </Link>
              </div>
            </>
          ) : (
            <div className="popover__empty">Sélectionnez un événement dans la liste pour afficher sa fiche.</div>
          )}
        </aside>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier l’événement' : 'Nouvel événement'}
        subtitle="Planifiez la production et affectez les moyens matériels."
        icon={<CalendarPlus size={16} />}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button type="submit" form="evenement-form" className="btn btn-primary">
              {editing ? 'Enregistrer' : 'Créer l’événement'}
            </button>
          </>
        }
      >
        <form id="evenement-form" className="form" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Nom de l’événement" htmlFor="evt-nom" required error={errors.nom} className="span-2">
              <input
                id="evt-nom"
                type="text"
                value={draft.nom}
                onChange={(event) => setField('nom', event.target.value)}
                placeholder="Ex. Nuits Sonores 2026"
              />
            </Field>
            <Field label="Type" htmlFor="evt-type">
              <select id="evt-type" value={draft.type} onChange={(event) => setField('type', event.target.value)}>
                {TYPES_EVENEMENT.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Statut" htmlFor="evt-statut">
              <select id="evt-statut" value={draft.statut} onChange={(event) => setField('statut', event.target.value)}>
                {STATUTS_EVENEMENT.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Date de début" htmlFor="evt-debut" required error={errors.dateDebut}>
              <input id="evt-debut" type="date" value={draft.dateDebut} onChange={(event) => setField('dateDebut', event.target.value)} />
            </Field>
            <Field label="Date de fin" htmlFor="evt-fin" required error={errors.dateFin}>
              <input id="evt-fin" type="date" value={draft.dateFin} onChange={(event) => setField('dateFin', event.target.value)} />
            </Field>
            <Field label="Lieu" htmlFor="evt-lieu" required error={errors.lieu}>
              <input id="evt-lieu" type="text" value={draft.lieu} onChange={(event) => setField('lieu', event.target.value)} placeholder="Site, salle, ville" />
            </Field>
            <Field label="Participants" htmlFor="evt-participants">
              <input
                id="evt-participants"
                type="number"
                min="0"
                value={draft.participants}
                onChange={(event) => setField('participants', event.target.value)}
              />
            </Field>
            <Field label="Responsable" htmlFor="evt-responsable" required error={errors.responsableId} className="span-2">
              <select
                id="evt-responsable"
                value={draft.responsableId}
                onChange={(event) => setField('responsableId', event.target.value)}
              >
                <option value="">Sélectionner…</option>
                {utilisateurs.map((item) => (
                  <option key={item.id} value={item.id}>{item.nom} · {item.role}</option>
                ))}
              </select>
            </Field>
            <Field label="Description" htmlFor="evt-desc" className="span-2">
              <textarea
                id="evt-desc"
                value={draft.description}
                onChange={(event) => setField('description', event.target.value)}
                placeholder="Contexte, contraintes techniques, consignes de production…"
              />
            </Field>
          </div>

          <div className="form-section">
            <div className="form-section__head">
              <span className="form-section__num">02</span>
              <div>
                <div className="form-section__title">Matériel affecté</div>
                <div className="form-section__hint">Sélectionnez les références prévues pour cet événement.</div>
              </div>
            </div>
            <div className="checkbox-grid">
              {materiels.map((materiel) => {
                const checked = draft.materielIds.includes(materiel.id)
                return (
                  <label className={`checkbox-row ${checked ? 'is-checked' : ''}`.trim()} key={materiel.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMateriel(materiel.id)}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', color: 'var(--text)', fontWeight: 600 }}>{materiel.nom}</span>
                      <span className="cell-sub">{materiel.reference} · {materiel.quantiteDisponible} dispo</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.nom || 'Détail de l’événement'}
        subtitle={detail ? `${detail.type} · ${detail.lieu}` : undefined}
        icon={<CalendarDays size={16} />}
        variant="drawer"
        footer={
          detail && (
            <>
              <button type="button" className="btn btn-danger" onClick={() => remove(detail)}>
                <Trash2 size={14} />
                Supprimer
              </button>
              <div className="toolbar__spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => openEdit(detail)}>
                <Pencil size={14} />
                Modifier
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="form">
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">Statut</div>
                <div className="detail-item__value"><StatusBadge status={detail.statut} /></div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Type</div>
                <div className="detail-item__value">{detail.type}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Début</div>
                <div className="detail-item__value">{periodLabel(detail.dateDebut, detail.dateDebut)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Fin</div>
                <div className="detail-item__value">{periodLabel(detail.dateFin, detail.dateFin)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Lieu</div>
                <div className="detail-item__value">{detail.lieu}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Responsable</div>
                <div className="detail-item__value">{detail.responsable}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Participants</div>
                <div className="detail-item__value mono">{formatNumber(detail.participants)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Matériel</div>
                <div className="detail-item__value">{detail.materielIds.length} référence(s)</div>
              </div>
              <div className="detail-item detail-item--full">
                <div className="detail-item__label">Description</div>
                <div className="detail-item__value" style={{ fontWeight: 500 }}>
                  {detail.description || 'Aucune description.'}
                </div>
              </div>
            </div>

            <div>
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <Package size={13} /> Manifeste matériel
                  </div>
                  <p className="card-head__subtitle">{selectedMateriels.length} référence(s) mobilisées</p>
                </div>
              </div>
              <div className="detail-list">
                {detail.materielIds.map((id) => {
                  const materiel = materiels.find((item) => item.id === id)
                  if (!materiel) return null
                  return (
                    <div className="detail-list__row" key={id}>
                      <span className="detail-list__label">
                        <Package size={12} />
                        {materiel.nom}
                      </span>
                      <span className="detail-list__value mono">{materiel.reference}</span>
                    </div>
                  )
                })}
                {!detail.materielIds.length && <span className="cell-sub">Aucun matériel affecté.</span>}
              </div>
            </div>

            <div className="divider" />
            <div className="insight-strip">
              <span className="insight-strip__icon">
                <UserRound size={12} />
              </span>
              <span>
                Responsable : <strong>{detail.responsable}</strong> · {formatNumber(detail.participants)} participants attendus
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Evenements
