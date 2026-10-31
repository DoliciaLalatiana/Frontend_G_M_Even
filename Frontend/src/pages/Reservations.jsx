import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Gauge,
  MapPin,
  Package,
  Pencil,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import DataTable from '../components/common/DataTable'
import Field from '../components/common/Field'
import FilterSelect from '../components/common/FilterSelect'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import SearchBar from '../components/common/SearchBar'
import StatusBadge from '../components/common/StatusBadge'
import { useConfirm } from '../context/ConfirmContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useDebounce } from '../hooks/useDebounce'
import { checkDisponibilitePeriode, rangesOverlap } from '../services/stockService'
import { PAGE_SIZE, STATUTS_RESERVATION } from '../utils/constants'
import {
  formatDate,
  formatMonth,
  formatNumber,
  periodLabel,
  toISODate,
  todayISO,
} from '../utils/format'

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const isoAddDays = (iso, days) => toISODate(addDays(new Date(`${iso}T12:00:00`), days))

const startOfWeek = (date) => {
  const next = new Date(date)
  const offset = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - offset)
  return next
}

const buildMonthCells = (cursor) => {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

const emptyDraft = (utilisateurs, prefill = {}) => {
  const start = prefill.dateDebut || isoAddDays(todayISO(), 7)
  return {
    client: '',
    evenementId: prefill.evenementId || '',
    evenementNom: '',
    lieu: '',
    dateDebut: start,
    dateFin: prefill.dateFin || isoAddDays(start, 2),
    responsableId: utilisateurs[0]?.id || '',
    statut: 'En attente',
    materielIds: prefill.materielIds || [],
    notes: '',
  }
}

const Reservations = () => {
  const {
    reservations,
    materiels,
    utilisateurs,
    evenements,
    emprunts,
    addReservation,
    updateReservation,
    cancelReservation,
    deleteReservation,
  } = useData()
  const { pushToast } = useToast()
  const confirm = useConfirm()
  const [query, setQuery] = useState('')
  const [statut, setStatut] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [view, setView] = useState('calendar')
  const [cursor, setCursor] = useState(() => new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(() => emptyDraft(utilisateurs))
  const [errors, setErrors] = useState({})
  const [detailId, setDetailId] = useState(null)
  const [simMaterielId, setSimMaterielId] = useState('')
  const [simDebut, setSimDebut] = useState(isoAddDays(todayISO(), 7))
  const [simFin, setSimFin] = useState(isoAddDays(todayISO(), 9))
  const [simResult, setSimResult] = useState(null)
  const debounced = useDebounce(query, 200)

  const conflictsByReservation = useMemo(() => {
    const map = {}
    reservations
      .filter((reservation) => reservation.statut !== 'Annulée')
      .forEach((reservation) => {
        const check = checkDisponibilitePeriode({
          materielIds: reservation.materielIds,
          dateDebut: reservation.dateDebut,
          dateFin: reservation.dateFin,
          reservations,
          emprunts,
          excludeReservationId: reservation.id,
        })
        if (!check.disponible) {
          map[reservation.id] = {
            ...check,
            references: [
              ...check.reservations.map((item) => item.reference),
              ...check.emprunts.map((item) => item.reference),
            ],
          }
        }
      })
    return map
  }, [emprunts, reservations])

  const conflictRows = useMemo(
    () =>
      reservations
        .filter((reservation) => conflictsByReservation[reservation.id])
        .map((reservation) => ({
          reservation,
          conflictedMateriels: reservation.materielIds
            .filter((id) =>
              conflictsByReservation[reservation.id].reservations.some((other) =>
                other.materielIds.includes(id),
              ) ||
              conflictsByReservation[reservation.id].emprunts.some((other) =>
                other.lignes.some((ligne) => ligne.materielId === id),
              ),
            )
            .map((id) => materiels.find((item) => item.id === id)?.nom)
            .filter(Boolean),
          references: conflictsByReservation[reservation.id].references,
        })),
    [conflictsByReservation, materiels, reservations],
  )

  const stats = useMemo(() => {
    const engagements = reservations.filter(
      (reservation) =>
        reservation.statut !== 'Annulée' &&
        reservation.dateFin >= todayISO() &&
        reservation.dateDebut <= isoAddDays(todayISO(), 30),
    )
    const unique = new Set(engagements.flatMap((reservation) => reservation.materielIds))
    return {
      confirmees: reservations.filter((reservation) => reservation.statut === 'Confirmée').length,
      attente: reservations.filter((reservation) => reservation.statut === 'En attente').length,
      engagements: engagements.length,
      taux: materiels.length ? Math.min(100, Math.round((unique.size / materiels.length) * 100)) : 0,
    }
  }, [materiels.length, reservations])

  const tabCounts = useMemo(
    () => ({
      all: reservations.length,
      Confirmée: reservations.filter((item) => item.statut === 'Confirmée').length,
      'En attente': reservations.filter((item) => item.statut === 'En attente').length,
      Annulée: reservations.filter((item) => item.statut === 'Annulée').length,
    }),
    [reservations],
  )

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase()
    return reservations.filter((reservation) => {
      if (statut && reservation.statut !== statut) return false
      if (activeTab !== 'all' && reservation.statut !== activeTab) return false
      if (!term) return true
      const noms = reservation.materielIds
        .map((id) => materiels.find((item) => item.id === id)?.nom)
        .join(' ')
      return [reservation.reference, reservation.client, reservation.evenementNom, reservation.lieu, noms]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    })
  }, [activeTab, debounced, materiels, reservations, statut])

  const detail = reservations.find((reservation) => reservation.id === detailId) || null
  const monthCells = buildMonthCells(cursor)
  const weekStart = startOfWeek(cursor)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const weekStartISO = toISODate(weekDays[0])
  const weekEndISO = toISODate(weekDays[6])
  const ganttReservations = reservations
    .filter(
      (reservation) =>
        reservation.statut !== 'Annulée' &&
        rangesOverlap(weekStartISO, weekEndISO, reservation.dateDebut, reservation.dateFin),
    )
    .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))

  const isToday = (date) => toISODate(date) === todayISO()

  const eventsForDay = (date) => {
    const iso = toISODate(date)
    return reservations.filter(
      (reservation) =>
        reservation.statut !== 'Annulée' &&
        reservation.dateDebut <= iso &&
        reservation.dateFin >= iso,
    )
  }

  const toneForReservation = (reservation) =>
    conflictsByReservation[reservation.id]
      ? 'var(--danger)'
      : reservation.statut === 'En attente'
        ? 'var(--warning)'
        : 'var(--cyan)'

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const openCreate = (prefill = {}) => {
    setDetailId(null)
    setEditingId(null)
    setDraft(emptyDraft(utilisateurs, prefill))
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (reservation) => {
    setDetailId(null)
    setEditingId(reservation.id)
    setDraft({
      client: reservation.client,
      evenementId: reservation.evenementId || '',
      evenementNom: reservation.evenementNom,
      lieu: reservation.lieu,
      dateDebut: reservation.dateDebut,
      dateFin: reservation.dateFin,
      responsableId: reservation.responsableId,
      statut: reservation.statut,
      materielIds: [...reservation.materielIds],
      notes: reservation.notes || '',
    })
    setErrors({})
    setFormOpen(true)
  }

  const onEventChange = (evenementId) => {
    const evenement = evenements.find((item) => item.id === evenementId)
    setDraft((current) => ({
      ...current,
      evenementId,
      evenementNom: evenement?.nom || current.evenementNom,
      lieu: evenement?.lieu || current.lieu,
      dateDebut: evenement?.dateDebut || current.dateDebut,
      dateFin: evenement?.dateFin || current.dateFin,
      responsableId: evenement?.responsableId || current.responsableId,
      materielIds: evenement?.materielIds ? [...evenement.materielIds] : current.materielIds,
    }))
  }

  const toggleMateriel = (materielId) =>
    setDraft((current) => ({
      ...current,
      materielIds: current.materielIds.includes(materielId)
        ? current.materielIds.filter((id) => id !== materielId)
        : [...current.materielIds, materielId],
    }))

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!draft.client.trim()) next.client = 'Renseignez le client.'
    if (!draft.evenementNom.trim()) next.evenementNom = 'Renseignez le nom de l’événement.'
    if (!draft.dateDebut) next.dateDebut = 'Renseignez la date de début.'
    if (!draft.dateFin) next.dateFin = 'Renseignez la date de fin.'
    if (draft.dateDebut && draft.dateFin && draft.dateFin < draft.dateDebut) {
      next.dateFin = 'La date de fin doit suivre la date de début.'
    }
    if (!draft.materielIds.length) next.materielIds = 'Sélectionnez au moins un matériel.'
    setErrors(next)
    if (Object.keys(next).length) return

    const payload = {
      ...draft,
      client: draft.client.trim(),
      evenementNom: draft.evenementNom.trim(),
      lieu: draft.lieu.trim(),
      notes: draft.notes.trim(),
    }
    const result = editingId ? updateReservation(editingId, payload) : addReservation(payload)
    if (!result.ok) {
      pushToast({ title: 'Réservation impossible', message: result.message, type: 'error' })
      return
    }

    pushToast({
      title: editingId ? 'Réservation mise à jour' : 'Réservation créée',
      message: `${payload.evenementNom} · ${payload.materielIds.length} référence(s) · ${periodLabel(payload.dateDebut, payload.dateFin)}`,
    })
    setFormOpen(false)
  }

  const handleCancel = async (reservation) => {
    const ok = await confirm({
      title: 'Annuler cette réservation ?',
      message: `${reservation.reference} — ${reservation.evenementNom}. Le matériel sera libéré sur la période.`,
      confirmLabel: 'Annuler la réservation',
      cancelLabel: 'Conserver',
      tone: 'warning',
    })
    if (!ok) return
    cancelReservation(reservation.id)
    pushToast({ title: 'Réservation annulée', message: reservation.reference, type: 'warning' })
  }

  const handleDelete = async (reservation) => {
    const ok = await confirm({
      title: 'Supprimer cette réservation ?',
      message: `${reservation.reference} — ${reservation.evenementNom}. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      tone: 'danger',
    })
    if (!ok) return
    deleteReservation(reservation.id)
    if (detailId === reservation.id) setDetailId(null)
    pushToast({ title: 'Réservation supprimée', message: reservation.reference, type: 'warning' })
  }

  const simulate = () => {
    if (!simMaterielId) {
      pushToast({ title: 'Matériel requis', message: 'Sélectionnez un matériel à simuler.', type: 'warning' })
      return
    }
    if (!simDebut || !simFin || simFin < simDebut) {
      setSimResult({
        tone: 'var(--danger)',
        title: 'Période invalide',
        text: 'La date de fin doit suivre la date de début.',
      })
      return
    }
    const materiel = materiels.find((item) => item.id === simMaterielId)
    const check = checkDisponibilitePeriode({
      materielIds: [simMaterielId],
      dateDebut: simDebut,
      dateFin: simFin,
      reservations,
      emprunts,
    })
    if (!check.disponible) {
      setSimResult({
        tone: 'var(--danger)',
        title: `Tension détectée (${check.totalConflits})`,
        text: `${materiel?.nom || 'Matériel'} est déjà engagé sur ${periodLabel(simDebut, simFin)}. Choisissez une autre période.`,
      })
      return
    }
    setSimResult({
      tone: 'var(--success)',
      title: 'Aucun conflit détecté',
      text: `${materiel?.nom || 'Matériel'} est disponible sur ${periodLabel(simDebut, simFin)}.`,
    })
  }

  const shiftPeriod = (direction) => {
    if (view === 'gantt') {
      setCursor((current) => addDays(current, direction * 7))
    } else {
      setCursor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
    }
  }

  const columns = [
    {
      key: 'reference',
      label: 'Réf & client',
      render: (row) => {
        const conflict = conflictsByReservation[row.id]
        return (
          <div className="table-entity">
            <span
              className="table-thumb table-thumb--sm"
              style={{ '--thumb-tone': conflict ? 'var(--danger)' : 'var(--violet-light)' }}
            >
              {conflict ? <AlertTriangle size={14} /> : <CalendarDays size={14} />}
            </span>
            <div>
              <div className="cell-main mono">{row.reference}</div>
              <div className="cell-sub">{row.client}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'evenement',
      label: 'Événement / lieu',
      render: (row) => (
        <div>
          <div className="cell-main">{row.evenementNom}</div>
          <div className="cell-sub">{row.lieu || 'Lieu à confirmer'}</div>
        </div>
      ),
    },
    {
      key: 'materiel',
      label: 'Matériel réservé',
      render: (row) => (
        <div className="materiel-name-cell">
          <div className="cell-main">{row.materielIds.length} référence(s)</div>
          <div className="cell-sub">
            {row.materielIds
              .slice(0, 2)
              .map((id) => materiels.find((item) => item.id === id)?.nom)
              .filter(Boolean)
              .join(', ')}
            {row.materielIds.length > 2 ? ` +${row.materielIds.length - 2}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'periode',
      label: 'Période',
      render: (row) => (
        <div>
          <div className="cell-main">{periodLabel(row.dateDebut, row.dateFin)}</div>
          <div className="cell-sub">{formatDate(row.dateDebut)}</div>
        </div>
      ),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <StatusBadge status={row.statut} />
          {conflictsByReservation[row.id] && (
            <span className="badge badge--danger" title={conflictsByReservation[row.id].references.join(', ')}>
              <AlertTriangle size={10} />
              Conflit
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <div className="table-actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="btn-icon is-cyan" onClick={() => setDetailId(row.id)} aria-label="Voir">
            <Eye size={14} />
          </button>
          <button type="button" className="btn-icon is-violet" onClick={() => openEdit(row)} aria-label="Modifier">
            <Pencil size={14} />
          </button>
          {row.statut !== 'Annulée' && (
            <button type="button" className="btn-icon is-danger" onClick={() => handleCancel(row)} aria-label="Annuler">
              <X size={14} />
            </button>
          )}
          <button type="button" className="btn-icon is-danger" onClick={() => handleDelete(row)} aria-label="Supprimer">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="Planification globale & disponibilité flotte"
        title="Réservations & planning"
        subtitle="Calendrier des disponibilités, options commerciales et arbitrage des tensions matériel."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
            <CalendarPlus size={15} />
            Nouvelle réservation
          </button>
        }
      />

      <div className="metrics-strip">
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--success)' }}>
            <CheckCircle2 size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Réservations confirmées</div>
            <div className="metrics-strip__value">
              {formatNumber(stats.confirmees)} <small>dossiers</small>
            </div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--warning)' }}>
            <Clock size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Options en attente</div>
            <div className="metrics-strip__value">
              {formatNumber(stats.attente)} <small>devis</small>
            </div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--danger)' }}>
            <AlertTriangle size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Conflits de stock</div>
            <div className="metrics-strip__value" style={{ color: 'var(--danger)' }}>
              {formatNumber(conflictRows.length)} <small>tensions</small>
            </div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--cyan)' }}>
            <Gauge size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Taux d’engagement 30 j</div>
            <div className="metrics-strip__value">
              {stats.taux}% <small>{stats.engagements} dossier(s)</small>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="calendar__head">
          <div>
            <div className="calendar__title">
              {view === 'calendar' ? formatMonth(cursor) : `Semaine du ${periodLabel(weekStartISO, weekEndISO)}`}
            </div>
            <p className="card-head__subtitle">
              {view === 'calendar'
                ? 'Cliquez sur une réservation pour ouvrir son dossier.'
                : 'Vue hebdomadaire des dossiers engageant la flotte.'}
            </p>
          </div>
          <div className="calendar__nav">
            <button type="button" className="btn-icon" onClick={() => shiftPeriod(-1)} aria-label="Période précédente">
              <ChevronLeft size={15} />
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date())}>
              Aujourd’hui
            </button>
            <button type="button" className="btn-icon" onClick={() => shiftPeriod(1)} aria-label="Période suivante">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="filter-pills" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`pill ${view === 'calendar' ? 'is-active' : ''}`.trim()}
            onClick={() => setView('calendar')}
          >
            Calendrier
          </button>
          <button
            type="button"
            className={`pill ${view === 'gantt' ? 'is-active' : ''}`.trim()}
            onClick={() => setView('gantt')}
          >
            Gantt matériels
          </button>
        </div>

        {view === 'calendar' ? (
          <>
            <div className="calendar__grid">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div className="calendar__weekday" key={day}>{day}</div>
              ))}
              {monthCells.map((date) => {
                const iso = toISODate(date)
                const events = eventsForDay(date)
                const outside = date.getMonth() !== cursor.getMonth()
                return (
                  <div
                    key={iso}
                    className={`calendar__day ${outside ? 'is-outside' : ''} ${isToday(date) ? 'is-today' : ''}`.trim()}
                  >
                    <div className="calendar__day-top">
                      <span className="calendar__day-num">{date.getDate()}</span>
                      {events.length > 0 && <span className="calendar__day-count">{events.length}</span>}
                    </div>
                    {events.slice(0, 2).map((reservation) => (
                      <button
                        type="button"
                        key={reservation.id}
                        className="calendar__event"
                        style={{ '--tone': toneForReservation(reservation) }}
                        onClick={() => setDetailId(reservation.id)}
                        title={`${reservation.reference} · ${reservation.evenementNom}`}
                      >
                        {reservation.evenementNom}
                      </button>
                    ))}
                    {events.length > 2 && (
                      <span className="calendar__more">+{events.length - 2} autre(s)</span>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="gantt__scroll">
            <div className="gantt__inner">
              <div className="gantt__head">
                <div className="gantt__head-label">Dossiers</div>
                {weekDays.map((day, index) => (
                  <div
                    key={toISODate(day)}
                    className={`gantt__head-day ${index >= 5 ? 'is-weekend' : ''}`.trim()}
                  >
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' })} {day.getDate()}
                  </div>
                ))}
              </div>
              {ganttReservations.length ? (
                ganttReservations.map((reservation) => {
                  const tone = toneForReservation(reservation)
                  return (
                    <div className="gantt__row" key={reservation.id}>
                      <div className="gantt__label">
                        <div className="gantt__label-name">{reservation.evenementNom}</div>
                        <div className="gantt__label-sub">{reservation.reference} · {reservation.materielIds.length} réf.</div>
                      </div>
                      {weekDays.map((day) => {
                        const active = rangesOverlap(
                          toISODate(day),
                          toISODate(day),
                          reservation.dateDebut,
                          reservation.dateFin,
                        )
                        return (
                          <div className="gantt__cell" key={toISODate(day)}>
                            {active && (
                              <button
                                type="button"
                                className="gantt__bar"
                                style={{ '--tone': tone, border: 'none', cursor: 'pointer' }}
                                onClick={() => setDetailId(reservation.id)}
                                title={reservation.evenementNom}
                              >
                                {toISODate(day) === reservation.dateDebut ||
                                toISODate(day) === toISODate(weekDays[0])
                                  ? reservation.reference
                                  : ''}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              ) : (
                <div className="empty-state" style={{ padding: '24px 12px' }}>
                  <span className="empty-state__icon">
                    <CalendarDays size={20} />
                  </span>
                  <div className="empty-state__title">Aucun dossier cette semaine</div>
                  <p className="empty-state__text">Aucune réservation active ne chevauche cette période.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Filtrer une référence, un client, un lieu…"
            ariaLabel="Rechercher une réservation"
          />
        </div>
        <div className="toolbar__group">
          <FilterSelect
            value={statut}
            onChange={setStatut}
            label="Statut"
            allLabel="Tous les statuts"
            options={STATUTS_RESERVATION}
          />
          <span className="toolbar__count">{filtered.length} dossier(s)</span>
        </div>
      </div>

      <div className="filter-pills">
        {[
          { key: 'all', label: 'Toutes' },
          ...STATUTS_RESERVATION.map((item) => ({ key: item, label: item })),
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
          onRowClick={(row) => setDetailId(row.id)}
          emptyTitle="Aucune réservation"
          emptyText="Aucun dossier ne correspond aux filtres sélectionnés."
          emptyIcon={<CalendarDays size={22} />}
          emptyAction={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openCreate()}>
              <CalendarPlus size={14} />
              Créer une réservation
            </button>
          }
          minWidth="880px"
          footer={<span>{filtered.length} dossier(s) · {formatNumber(stats.engagements)} engagement(s) sous 30 jours</span>}
        />

        <div className="form">
          <div className="tension-panel">
            <div className="tension-panel__head">
              <span className="tension-panel__icon">
                <AlertTriangle size={15} />
              </span>
              <div>
                <div className="tension-panel__title">Alerte tension matériel</div>
                <div className="tension-panel__sub">
                  {conflictRows.length
                    ? `${conflictRows.length} dossier(s) en chevauchement détecté(s)`
                    : 'Aucun conflit sur les dossiers actifs'}
                </div>
              </div>
            </div>

            {conflictRows.length ? (
              conflictRows.slice(0, 3).map((row) => (
                <div className="conflict-box" key={row.reservation.id}>
                  <div className="conflict-row">
                    <strong>{row.reservation.reference}</strong>
                    <span>{row.references.length} chevauchement(s)</span>
                  </div>
                  <div className="conflict-row">
                    <span>{row.reservation.evenementNom}</span>
                    <span className="mono">{periodLabel(row.reservation.dateDebut, row.reservation.dateFin)}</span>
                  </div>
                  <div className="conflict-row">
                    <span>{row.conflictedMateriels.slice(0, 2).join(', ') || 'Matériel partagé'}</span>
                    <span className="mono" title={row.references.join(', ')}>Voir</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="stage-health">
                <div className="stage-health__row">
                  <span>Flotte sécurisée</span>
                  <span className="stage-health__value">AUCUN CONFLIT</span>
                </div>
                <div className="stage-health__row">
                  <span>Dossiers actifs</span>
                  <span className="stage-health__value">{reservations.filter((item) => item.statut !== 'Annulée').length}</span>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <TrendingUp size={13} /> Simulateur de disponibilité
                </div>
                <p className="card-head__subtitle">Testez un créneau avant de poser une option.</p>
              </div>
            </div>
            <div className="form">
              <Field label="Matériel" htmlFor="sim-materiel">
                <select
                  id="sim-materiel"
                  value={simMaterielId}
                  onChange={(event) => {
                    setSimMaterielId(event.target.value)
                    setSimResult(null)
                  }}
                >
                  <option value="">Sélectionner…</option>
                  {materiels.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nom} · {item.quantiteDisponible}/{item.quantiteTotale}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="simulator">
                <Field label="Du" htmlFor="sim-debut">
                  <input
                    id="sim-debut"
                    type="date"
                    value={simDebut}
                    onChange={(event) => {
                      setSimDebut(event.target.value)
                      setSimResult(null)
                    }}
                  />
                </Field>
                <Field label="Au" htmlFor="sim-fin">
                  <input
                    id="sim-fin"
                    type="date"
                    value={simFin}
                    onChange={(event) => {
                      setSimFin(event.target.value)
                      setSimResult(null)
                    }}
                  />
                </Field>
                <button type="button" className="btn btn-secondary" onClick={simulate}>
                  <Gauge size={14} />
                  Simuler
                </button>
              </div>

              {simResult && (
                <div className="sim-result" style={{ '--tone': simResult.tone }}>
                  <span className="sim-result__icon">
                    {simResult.tone === 'var(--success)' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  </span>
                  <div>
                    <div className="sim-result__title">{simResult.title}</div>
                    <div className="sim-result__text">{simResult.text}</div>
                  </div>
                </div>
              )}

              {simMaterielId && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    openCreate({
                      dateDebut: simDebut,
                      dateFin: simFin,
                      materielIds: [simMaterielId],
                    })
                  }
                >
                  <CalendarPlus size={13} />
                  Créer une option sur cette période
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Modifier la réservation' : 'Nouvelle réservation'}
        subtitle={editingId ? 'Les conflits de disponibilité sont revérifiés à l’enregistrement.' : 'Le dossier est contrôlé sur toute la période.'}
        icon={<CalendarPlus size={16} />}
        size="lg"
        footer={
          <>
            <span className="field__hint" style={{ marginRight: 'auto' }}>
              {draft.materielIds.length} référence(s) sélectionnée(s)
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button type="submit" form="reservation-form" className="btn btn-primary">
              {editingId ? 'Enregistrer' : 'Créer la réservation'}
            </button>
          </>
        }
      >
        <form id="reservation-form" className="form" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Client" htmlFor="res-client" required error={errors.client}>
              <input
                id="res-client"
                value={draft.client}
                onChange={(event) => setField('client', event.target.value)}
                placeholder="Ex : Ville de Lyon"
              />
            </Field>
            <Field label="Événement existant" htmlFor="res-event">
              <select id="res-event" value={draft.evenementId} onChange={(event) => onEventChange(event.target.value)}>
                <option value="">Réservation libre</option>
                {evenements.map((item) => (
                  <option key={item.id} value={item.id}>{item.nom}</option>
                ))}
              </select>
            </Field>
            <Field label="Nom de l’événement" htmlFor="res-nom" required error={errors.evenementNom}>
              <input
                id="res-nom"
                value={draft.evenementNom}
                onChange={(event) => setField('evenementNom', event.target.value)}
                placeholder="Ex : Festival Nuits Sonores"
              />
            </Field>
            <Field label="Lieu" htmlFor="res-lieu">
              <input
                id="res-lieu"
                value={draft.lieu}
                onChange={(event) => setField('lieu', event.target.value)}
                placeholder="Site, salle, ville"
              />
            </Field>
            <Field label="Début" htmlFor="res-debut" required error={errors.dateDebut}>
              <input
                id="res-debut"
                type="date"
                value={draft.dateDebut}
                onChange={(event) => setField('dateDebut', event.target.value)}
              />
            </Field>
            <Field label="Fin" htmlFor="res-fin" required error={errors.dateFin}>
              <input
                id="res-fin"
                type="date"
                value={draft.dateFin}
                onChange={(event) => setField('dateFin', event.target.value)}
              />
            </Field>
            <Field label="Responsable" htmlFor="res-responsable">
              <select
                id="res-responsable"
                value={draft.responsableId}
                onChange={(event) => setField('responsableId', event.target.value)}
              >
                {utilisateurs.map((item) => (
                  <option key={item.id} value={item.id}>{item.nom} · {item.role}</option>
                ))}
              </select>
            </Field>
            <Field label="Statut" htmlFor="res-statut">
              <select
                id="res-statut"
                value={draft.statut}
                onChange={(event) => setField('statut', event.target.value)}
              >
                {STATUTS_RESERVATION.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="form-section">
            <div className="form-section__head">
              <span className="form-section__num">01</span>
              <div>
                <div className="form-section__title">Matériel réservé</div>
                <div className="form-section__hint">
                  {errors.materielIds || 'Les conflits avec les emprunts actifs sont contrôlés automatiquement.'}
                </div>
              </div>
            </div>

            <div className="field__label" style={{ marginBottom: 6 }}>
              {draft.materielIds.length} référence(s) · {periodLabel(draft.dateDebut, draft.dateFin)}
            </div>
            <div className="checkbox-grid" style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
              {materiels.map((materiel) => (
                <label
                  key={materiel.id}
                  className={`checkbox ${draft.materielIds.includes(materiel.id) ? 'is-checked' : ''}`.trim()}
                >
                  <input
                    type="checkbox"
                    checked={draft.materielIds.includes(materiel.id)}
                    onChange={() => toggleMateriel(materiel.id)}
                  />
                  <span>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{materiel.nom}</span>
                    <span style={{ display: 'block', fontSize: 8, color: 'var(--text-muted)' }}>
                      {materiel.reference} · {materiel.quantiteDisponible} dispo
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Field label="Notes" htmlFor="res-notes">
            <textarea
              id="res-notes"
              value={draft.notes}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder="Contraintes de livraison, accès, contacts sur site…"
            />
          </Field>

          <div className="insight-strip">
            <span className="insight-strip__icon">
              <Users size={12} />
            </span>
            <span>
              Responsable :{' '}
              <strong>{utilisateurs.find((item) => item.id === draft.responsableId)?.nom || 'à définir'}</strong>
              {' · '}
              {draft.lieu || 'lieu à confirmer'}
            </span>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.reference || 'Réservation'}
        subtitle={detail ? `${detail.client} · ${detail.evenementNom}` : undefined}
        icon={<CalendarDays size={16} />}
        variant="drawer"
        footer={
          detail && (
            <>
              {detail.statut !== 'Annulée' && (
                <button type="button" className="btn btn-ghost" onClick={() => handleCancel(detail)}>
                  <X size={14} />
                  Annuler
                </button>
              )}
              <div className="toolbar__spacer" />
              <button type="button" className="btn btn-danger" onClick={() => handleDelete(detail)}>
                <Trash2 size={14} />
                Supprimer
              </button>
              <button type="button" className="btn btn-primary" onClick={() => openEdit(detail)}>
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
                <div className="detail-item__label">Client</div>
                <div className="detail-item__value">{detail.client}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Événement</div>
                <div className="detail-item__value">{detail.evenementNom}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Lieu</div>
                <div className="detail-item__value">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={12} /> {detail.lieu || '—'}
                  </span>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Période</div>
                <div className="detail-item__value">{periodLabel(detail.dateDebut, detail.dateFin)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Responsable</div>
                <div className="detail-item__value">
                  {utilisateurs.find((item) => item.id === detail.responsableId)?.nom || '—'}
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
                    <Package size={13} /> Matériel réservé
                  </div>
                  <p className="card-head__subtitle">{detail.materielIds.length} référence(s)</p>
                </div>
              </div>
              <div className="dispatch-manifest">
                {detail.materielIds.map((id) => {
                  const materiel = materiels.find((item) => item.id === id)
                  if (!materiel) return null
                  return (
                    <span className="chip" key={id}>
                      {materiel.nom}
                    </span>
                  )
                })}
              </div>
            </div>

            {conflictsByReservation[detail.id] && (
              <div className="conflict-box">
                <div className="conflict-row">
                  <strong><AlertTriangle size={11} /> Conflit de disponibilité</strong>
                  <span>{conflictsByReservation[detail.id].references.length} dossier(s)</span>
                </div>
                <div className="conflict-row">
                  <span>{conflictsByReservation[detail.id].references.join(', ')}</span>
                </div>
              </div>
            )}

            <div className="divider" />
            <div className="insight-strip">
              <span className="insight-strip__icon">
                <CalendarDays size={12} />
              </span>
              <span>{formatDate(detail.dateDebut)} → {formatDate(detail.dateFin)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Reservations
