import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownToLine,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Package,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Wrench,
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
  getEmpruntsEnRetard,
  getLignesRestantes,
  getRetoursEnAttente,
  getStatutEmpruntCalcule,
} from '../services/stockService'
import { ETATS_RETOUR, PAGE_SIZE } from '../utils/constants'
import { daysUntil, formatDate, formatNumber, periodLabel, todayISO } from '../utils/format'

const ETAT_TONE = {
  'Bon état': { tone: 'var(--success)', label: 'Conforme & nettoyé' },
  Incomplet: { tone: 'var(--warning)', label: 'Pièces ou accessoires manquants' },
  Endommagé: { tone: 'var(--danger)', label: 'Constat SAV à ouvrir' },
}

const getCloture = (retour, emprunt) => {
  if (retour.etat === 'Endommagé') return { label: 'SAV', tone: 'danger' }
  if (retour.etat === 'Incomplet') return { label: 'Écart', tone: 'warning' }
  if (emprunt?.statut === 'Retourné') return { label: 'Clôturé', tone: 'success' }
  return { label: 'Partiel', tone: 'cyan' }
}

const Retours = () => {
  const { emprunts, retours, materiels, utilisateurs, evenements, processRetour } = useData()
  const { pushToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const panelRef = useRef(null)
  const selectRef = useRef(null)

  const [query, setQuery] = useState('')
  const [etatFilter, setEtatFilter] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedEmpruntId, setSelectedEmpruntId] = useState('')
  const [quantites, setQuantites] = useState({})
  const [etat, setEtat] = useState('Bon état')
  const [commentaire, setCommentaire] = useState('')
  const [inspecteur, setInspecteur] = useState(utilisateurs[0]?.nom || '')
  const [detail, setDetail] = useState(null)
  const debounced = useDebounce(query, 200)

  const pending = useMemo(
    () =>
      getRetoursEnAttente(emprunts)
        .map((emprunt) => ({
          ...emprunt,
          restantes: getLignesRestantes(emprunt, retours),
          statutCalcule: getStatutEmpruntCalcule(emprunt),
        }))
        .filter((emprunt) => emprunt.restantes.length > 0),
    [emprunts, retours],
  )

  const history = useMemo(
    () =>
      [...retours]
        .sort((a, b) => new Date(b.dateRetour) - new Date(a.dateRetour))
        .map((retour) => ({
          ...retour,
          emprunt: emprunts.find((item) => item.id === retour.empruntId),
          materiel: materiels.find((item) => item.id === retour.materielId),
          emprunteur: utilisateurs.find((item) => item.id === retour.emprunteurId),
        })),
    [emprunts, materiels, retours, utilisateurs],
  )

  const stats = useMemo(() => {
    const today = todayISO()
    const attendus = pending.filter((emprunt) => emprunt.dateRetourPrevue === today)
    const conformes = retours.filter((retour) => retour.etat === 'Bon état').length
    const sav = retours.filter((retour) => retour.etat !== 'Bon état')
    return {
      attendus: attendus.length,
      attendusUnites: attendus.reduce(
        (sum, emprunt) => sum + emprunt.restantes.reduce((lineSum, ligne) => lineSum + ligne.quantiteRestante, 0),
        0,
      ),
      conformite: retours.length ? Math.round((conformes / retours.length) * 100) : 100,
      conformes,
      sav: sav.length,
      savUnites: sav.reduce((sum, retour) => sum + retour.quantite, 0),
      retards: getEmpruntsEnRetard(emprunts).length,
      unites: retours.reduce((sum, retour) => sum + retour.quantite, 0),
    }
  }, [emprunts, pending, retours])

  const matchSearch = (values) => {
    const term = debounced.trim().toLowerCase()
    if (!term) return true
    return values.filter(Boolean).some((value) => String(value).toLowerCase().includes(term))
  }

  const filteredPending = useMemo(
    () =>
      pending.filter((emprunt) => {
        const user = utilisateurs.find((item) => item.id === emprunt.emprunteurId)
        const event = evenements.find((item) => item.id === emprunt.evenementId)
        const noms = emprunt.restantes
          .map((ligne) => materiels.find((item) => item.id === ligne.materielId)?.nom)
          .join(' ')
        return matchSearch([emprunt.reference, user?.nom, event?.nom, noms])
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debounced, evenements, materiels, pending, utilisateurs],
  )

  const filteredHistory = useMemo(
    () =>
      history.filter((retour) => {
        if (activeTab === 'litiges' && retour.etat === 'Bon état') return false
        if (etatFilter && retour.etat !== etatFilter) return false
        return matchSearch([
          retour.reference,
          retour.emprunt?.reference,
          retour.emprunteur?.nom,
          retour.materiel?.nom,
          retour.commentaire,
        ])
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, debounced, etatFilter, history],
  )

  const selectedEmprunt = pending.find((emprunt) => emprunt.id === selectedEmpruntId) || null
  const selectedUser = selectedEmprunt
    ? utilisateurs.find((item) => item.id === selectedEmprunt.emprunteurId)
    : null

  useEffect(() => {
    const empruntId = searchParams.get('emprunt')
    if (!empruntId) return
    if (emprunts.some((emprunt) => emprunt.id === empruntId && emprunt.statut !== 'Retourné')) {
      setSelectedEmpruntId(empruntId)
      setActiveTab('pending')
    }
    const next = new URLSearchParams(searchParams)
    next.delete('emprunt')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedEmprunt) {
      setQuantites({})
      return
    }
    setQuantites(
      Object.fromEntries(
        selectedEmprunt.restantes.map((ligne) => [ligne.materielId, ligne.quantiteRestante]),
      ),
    )
    setCommentaire('')
    setEtat('Bon état')
  }, [selectedEmpruntId, selectedEmprunt?.restantes])

  const chooseEmprunt = (emprunt) => {
    setSelectedEmpruntId(emprunt.id)
    setActiveTab('pending')
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => selectRef.current?.focus(), 250)
  }

  const openPanel = () => {
    if (!selectedEmpruntId && pending[0]) setSelectedEmpruntId(pending[0].id)
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => selectRef.current?.focus(), 250)
  }

  const setQuantity = (materielId, value) =>
    setQuantites((current) => ({ ...current, [materielId]: value }))

  const selectAll = () => {
    if (!selectedEmprunt) return
    setQuantites(
      Object.fromEntries(
        selectedEmprunt.restantes.map((ligne) => [ligne.materielId, ligne.quantiteRestante]),
      ),
    )
    setEtat('Bon état')
  }

  const lignesACloturer = selectedEmprunt
    ? selectedEmprunt.restantes
        .map((ligne) => ({
          materielId: ligne.materielId,
          quantite: Number(quantites[ligne.materielId] || 0),
          quantiteRestante: ligne.quantiteRestante,
        }))
        .filter((ligne) => ligne.quantite > 0)
    : []

  const totalRestant = selectedEmprunt
    ? selectedEmprunt.restantes.reduce((sum, ligne) => sum + ligne.quantiteRestante, 0)
    : 0
  const totalPointe = lignesACloturer.reduce((sum, ligne) => sum + ligne.quantite, 0)

  const submit = (event) => {
    event.preventDefault()
    if (!selectedEmprunt) {
      pushToast({ title: 'Aucun bon sélectionné', message: 'Choisissez un bon d’emprunt à réceptionner.', type: 'warning' })
      return
    }
    if (!lignesACloturer.length) {
      pushToast({ title: 'Quantités invalides', message: 'Renseignez au moins une quantité à restituer.', type: 'error' })
      return
    }
    if (lignesACloturer.some((ligne) => ligne.quantite > ligne.quantiteRestante)) {
      pushToast({ title: 'Quantité excessive', message: 'Une quantité dépasse le reste attendu sur le bon.', type: 'error' })
      return
    }

    const result = processRetour({
      empruntId: selectedEmprunt.id,
      lignes: lignesACloturer.map((ligne) => ({
        materielId: ligne.materielId,
        quantite: ligne.quantite,
        etat,
        commentaire: commentaire.trim(),
      })),
      inspecteur,
    })

    if (!result.ok) {
      pushToast({ title: 'Réception impossible', message: result.message, type: 'error' })
      return
    }

    pushToast({
      title: result.complete ? 'Bon soldé' : 'Retour partiel enregistré',
      message: result.complete
        ? `${totalPointe} unité(s) réintégrée(s) · ${selectedEmprunt.reference} clôturé.`
        : `${totalPointe} unité(s) réintégrée(s) · ${totalRestant - totalPointe} encore attendue(s).`,
      type: result.complete ? 'success' : 'info',
    })

    if (result.complete) {
      setSelectedEmpruntId('')
    } else {
      setEtat('Bon état')
      setCommentaire('')
    }
  }

  const pendingColumns = [
    {
      key: 'reference',
      label: 'Bon de sortie',
      render: (row) => (
        <div className="table-entity">
          <span className="table-thumb table-thumb--sm" style={{ '--thumb-tone': row.statutCalcule === 'En retard' ? 'var(--danger)' : 'var(--violet-light)' }}>
            <ArrowDownToLine size={14} />
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
      render: (row) => (
        <div>
          <div className="cell-main">{utilisateurs.find((item) => item.id === row.emprunteurId)?.nom || '—'}</div>
          <div className="cell-sub">{evenements.find((item) => item.id === row.evenementId)?.nom || 'Sans événement'}</div>
        </div>
      ),
    },
    {
      key: 'materiel',
      label: 'Matériel attendu',
      render: (row) => (
        <div className="materiel-name-cell">
          <div className="cell-main">
            {row.restantes.length} référence(s) · {row.restantes.reduce((sum, ligne) => sum + ligne.quantiteRestante, 0)} unité(s)
          </div>
          <div className="cell-sub">
            {row.restantes
              .map((ligne) => materiels.find((item) => item.id === ligne.materielId)?.nom)
              .filter(Boolean)
              .join(', ')}
          </div>
        </div>
      ),
    },
    {
      key: 'echeance',
      label: 'Restitution prévue',
      render: (row) => {
        const days = daysUntil(row.dateRetourPrevue)
        return (
          <div>
            <div className="cell-main">{formatDate(row.dateRetourPrevue)}</div>
            <div className="cell-sub" style={{ color: days < 0 ? 'var(--danger)' : undefined }}>
              {days < 0 ? `${Math.abs(days)} jour(s) de retard` : days === 0 ? 'Attendu aujourd’hui' : `Dans ${days} jour(s)`}
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
      key: 'action',
      label: '',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={(event) => {
            event.stopPropagation()
            chooseEmprunt(row)
          }}
        >
          <RotateCcw size={13} />
          Restituer
        </button>
      ),
    },
  ]

  const historyColumns = [
    {
      key: 'reference',
      label: 'Réf. retour / bon',
      render: (row) => (
        <div className="table-entity">
          <span className="table-thumb table-thumb--sm" style={{ '--thumb-tone': row.etat === 'Bon état' ? 'var(--success)' : 'var(--warning)' }}>
            <PackageCheck size={14} />
          </span>
          <div>
            <div className="cell-main mono">{row.reference}</div>
            <div className="cell-sub mono">{row.emprunt?.reference || 'Bon inconnu'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'emprunteur',
      label: 'Emprunteur / Événement',
      render: (row) => {
        const event = evenements.find((item) => item.id === row.emprunt?.evenementId)
        return (
          <div>
            <div className="cell-main">{row.emprunteur?.nom || '—'}</div>
            <div className="cell-sub">{event?.nom || 'Sans événement'}</div>
          </div>
        )
      },
    },
    {
      key: 'materiel',
      label: 'Matériel restitué',
      render: (row) => (
        <div>
          <div className="cell-main">{row.materiel?.nom || 'Matériel inconnu'}</div>
          <div className="cell-sub mono">{row.materiel?.reference || '—'}</div>
        </div>
      ),
    },
    {
      key: 'quantite',
      label: 'Quantité',
      align: 'center',
      render: (row) => <span className="mono">{row.quantite}</span>,
    },
    {
      key: 'reception',
      label: 'Réception',
      render: (row) => (
        <div>
          <div className="cell-main">{formatDate(row.dateRetour)}</div>
          <div className="cell-sub">{row.inspecteur}</div>
        </div>
      ),
    },
    {
      key: 'etat',
      label: 'État constaté',
      render: (row) => <StatusBadge status={row.etat} />,
    },
    {
      key: 'cloture',
      label: 'Clôture',
      render: (row) => {
        const cloture = getCloture(row, row.emprunt)
        return <StatusBadge status={cloture.label} tone={cloture.tone} dot={false} />
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <button type="button" className="btn-icon is-cyan" onClick={() => setDetail(row)} aria-label="Voir">
          <Eye size={14} />
        </button>
      ),
    },
  ]

  const isHistory = activeTab !== 'pending'
  const rows = isHistory ? filteredHistory : filteredPending

  return (
    <div className="page">
      <PageHeader
        eyebrow="Flux réception & qualité"
        title="Retours de matériel"
        subtitle="Enregistrez les réceptions, contrôlez l’état technique et réintégrez le parc disponible."
        actions={
          <button type="button" className="btn btn-primary" onClick={openPanel}>
            <ClipboardCheck size={15} />
            Enregistrer un retour
          </button>
        }
      />

      <div className="metrics-strip">
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--cyan)' }}>
            <ArrowDownToLine size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Attendus aujourd’hui</div>
            <div className="metrics-strip__value">
              {formatNumber(stats.attendus)} <small>{formatNumber(stats.attendusUnites)} unités</small>
            </div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--success)' }}>
            <ShieldCheck size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Contrôlés & conformes</div>
            <div className="metrics-strip__value">
              {stats.conformite}% <small>{stats.conformes} retour(s)</small>
            </div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--danger)' }}>
            <Wrench size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Nécessitant SAV</div>
            <div className="metrics-strip__value">
              {formatNumber(stats.sav)} <small>{formatNumber(stats.savUnites)} unités</small>
            </div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--warning)' }}>
            <TriangleAlert size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Retours en retard</div>
            <div className="metrics-strip__value">
              {formatNumber(stats.retards)} <small>bons actifs</small>
            </div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Rechercher un bon, un matériel, un emprunteur…"
            ariaLabel="Rechercher un retour"
          />
        </div>
        <div className="toolbar__group">
          {isHistory && (
            <FilterSelect
              value={etatFilter}
              onChange={setEtatFilter}
              label="État"
              allLabel="Tous les états"
              options={ETATS_RETOUR}
            />
          )}
          <span className="toolbar__count">{rows.length} élément(s)</span>
        </div>
      </div>

      <div className="filter-pills">
        {[
          { key: 'pending', label: 'À traiter', count: pending.length },
          { key: 'history', label: 'Traités récents', count: history.length },
          { key: 'litiges', label: 'Écarts & SAV', count: history.filter((item) => item.etat !== 'Bon état').length },
        ].map((item) => (
          <button
            type="button"
            key={item.key}
            className={`pill ${activeTab === item.key ? 'is-active' : ''}`.trim()}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
            <span className="pill__count">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="return-layout">
        <div className="form">
          <DataTable
            columns={isHistory ? historyColumns : pendingColumns}
            rows={rows}
            pageSize={PAGE_SIZE}
            onRowClick={isHistory ? (row) => setDetail(row) : (row) => chooseEmprunt(row)}
            emptyTitle={isHistory ? 'Aucun retour enregistré' : 'Aucun retour attendu'}
            emptyText={
              isHistory
                ? 'Aucun retour ne correspond aux filtres sélectionnés.'
                : 'Tous les bons de sortie ont été restitués. Le parc est à jour.'
            }
            emptyIcon={isHistory ? <PackageCheck size={22} /> : <CheckCircle2 size={22} />}
            emptyAction={
              !isHistory && (
                <Link to="/emprunts" className="btn btn-secondary btn-sm">
                  Consulter les emprunts
                </Link>
              )
            }
            minWidth={isHistory ? '980px' : '820px'}
            footer={
              <span>
                {isHistory
                  ? `${filteredHistory.length} retour(s) · ${formatNumber(stats.unites)} unités réceptionnées`
                  : `${filteredPending.length} bon(s) en attente · ${formatNumber(pending.reduce((sum, emprunt) => sum + emprunt.restantes.reduce((lineSum, ligne) => lineSum + ligne.quantiteRestante, 0), 0))} unités attendues`}
              </span>
            }
          />

          <div className="insight-strip">
            <span className="insight-strip__icon">
              <ShieldCheck size={12} />
            </span>
            <span>
              Protocole <strong>SAV-V4</strong> : tout matériel classé <strong>Endommagé</strong> déclenche
              un constat horodaté et bloque la remise en stock jusqu’à validation atelier.
            </span>
          </div>
        </div>

        <aside ref={panelRef} className="card checkin-card">
          <div className="card-head">
            <div>
              <div className="card-head__title">
                <ClipboardCheck size={13} /> Enregistrement rapide
              </div>
              <p className="card-head__subtitle">Contrôle qualité et réintégration au stock.</p>
            </div>
            <span className="badge badge--cyan" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Poste #01
            </span>
          </div>

          <form className="form" onSubmit={submit}>
            <Field label="Bon d’emprunt d’origine" htmlFor="ret-bon">
              <select
                id="ret-bon"
                ref={selectRef}
                value={selectedEmpruntId}
                onChange={(event) => setSelectedEmpruntId(event.target.value)}
              >
                <option value="">Sélectionner un bon en attente…</option>
                {pending.map((emprunt) => (
                  <option key={emprunt.id} value={emprunt.id}>
                    {emprunt.reference} — {utilisateurs.find((item) => item.id === emprunt.emprunteurId)?.nom || 'Emprunteur'}
                  </option>
                ))}
              </select>
            </Field>

            {selectedEmprunt ? (
              <>
                <div className="return-summary">
                  <div className="return-summary__row">
                    <span>Emprunteur</span>
                    <strong>{selectedUser?.nom || '—'}</strong>
                  </div>
                  <div className="return-summary__row">
                    <span>Événement</span>
                    <strong>
                      {evenements.find((item) => item.id === selectedEmprunt.evenementId)?.nom || 'Sans événement'}
                    </strong>
                  </div>
                  <div className="return-summary__row">
                    <span>Période</span>
                    <strong>{periodLabel(selectedEmprunt.dateEmprunt, selectedEmprunt.dateRetourPrevue)}</strong>
                  </div>
                  <div className="return-summary__row">
                    <span>Statut</span>
                    <strong><StatusBadge status={selectedEmprunt.statutCalcule} /></strong>
                  </div>
                </div>

                <div>
                  <div className="field__label" style={{ marginBottom: 6 }}>État technique au déchargement</div>
                  <div className="state-radio-grid">
                    {ETATS_RETOUR.map((item) => (
                      <label
                        key={item}
                        className={`state-radio ${etat === item ? 'is-active' : ''}`.trim()}
                        style={{ '--tone': ETAT_TONE[item].tone }}
                      >
                        <input
                          type="radio"
                          name="ret-etat"
                          value={item}
                          checked={etat === item}
                          onChange={() => setEtat(item)}
                        />
                        <span className="state-radio__dot" />
                        <span>
                          <span style={{ display: 'block' }}>{item}</span>
                          <span style={{ display: 'block', fontSize: 8, fontWeight: 500, opacity: 0.75 }}>
                            {ETAT_TONE[item].label}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="field__label" style={{ marginBottom: 6 }}>Lignes à réceptionner</div>
                  <div className="lines-editor">
                    {selectedEmprunt.restantes.map((ligne) => {
                      const materiel = materiels.find((item) => item.id === ligne.materielId)
                      return (
                        <div className="return-line" key={ligne.materielId}>
                          <span className="return-line__name" title={materiel?.nom}>
                            {materiel?.nom || 'Matériel'}
                          </span>
                          <div className="return-line__qty">
                            <input
                              type="number"
                              min="0"
                              max={ligne.quantiteRestante}
                              value={quantites[ligne.materielId] ?? ''}
                              onChange={(event) => setQuantity(ligne.materielId, event.target.value)}
                              aria-label={`Quantité restituée ${materiel?.nom || ''}`}
                            />
                            <span className="return-line__max">/ {ligne.quantiteRestante}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={selectAll} style={{ marginTop: 6 }}>
                    <Package size={13} />
                    Tout restituer
                  </button>
                </div>

                <Field label="Rapport de contrôle" htmlFor="ret-commentaire">
                  <textarea
                    id="ret-commentaire"
                    value={commentaire}
                    onChange={(event) => setCommentaire(event.target.value)}
                    placeholder="Ex : choc léger sur la poignée du flight case, diodes testées à 100 %…"
                    rows={3}
                  />
                </Field>

                <Field label="Inspecteur" htmlFor="ret-inspecteur">
                  <select
                    id="ret-inspecteur"
                    value={inspecteur}
                    onChange={(event) => setInspecteur(event.target.value)}
                  >
                    {utilisateurs.map((item) => (
                      <option key={item.id} value={item.nom}>{item.nom} · {item.role}</option>
                    ))}
                  </select>
                </Field>

                <div className="return-summary">
                  <div className="return-summary__row">
                    <span>Lignes pointées</span>
                    <strong>{lignesACloturer.length} / {selectedEmprunt.restantes.length}</strong>
                  </div>
                  <div className="return-summary__row">
                    <span>Unités réintégrées</span>
                    <strong>{formatNumber(totalPointe)} / {formatNumber(totalRestant)}</strong>
                  </div>
                  <div className="return-summary__row">
                    <span>Reste attendu</span>
                    <strong>{formatNumber(Math.max(0, totalRestant - totalPointe))}</strong>
                  </div>
                  <div className="return-summary__row">
                    <span>État constaté</span>
                    <strong><StatusBadge status={etat} /></strong>
                  </div>
                </div>

                <div className="insight-strip">
                  <span className="insight-strip__icon">
                    <UserRound size={12} />
                  </span>
                  <span>
                    {selectedEmprunt.statutCalcule === 'En retard'
                      ? `Retard de ${Math.abs(daysUntil(selectedEmprunt.dateRetourPrevue))} jour(s) — relance recommandée.`
                      : `Restitution attendue le ${formatDate(selectedEmprunt.dateRetourPrevue)}.`}
                  </span>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={!lignesACloturer.length}>
                  <CheckCircle2 size={15} />
                  Réintégrer dans le stock disponible
                </button>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '22px 14px' }}>
                <span className="empty-state__icon">
                  <PackageCheck size={20} />
                </span>
                <div className="empty-state__title">Aucun bon sélectionné</div>
                <p className="empty-state__text">
                  Choisissez un bon de sortie actif pour enregistrer sa réception.
                </p>
              </div>
            )}
          </form>
        </aside>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.reference || 'Détail du retour'}
        subtitle={
          detail
            ? `${detail.materiel?.nom || 'Matériel'} · ${formatDate(detail.dateRetour)}`
            : undefined
        }
        icon={<PackageCheck size={16} />}
        variant="drawer"
        footer={
          detail && (
            <>
              <Link to="/emprunts" className="btn btn-secondary">
                <RotateCcw size={14} />
                Consulter les emprunts
              </Link>
              <div className="toolbar__spacer" />
              <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>
                Fermer
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="form">
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">État constaté</div>
                <div className="detail-item__value"><StatusBadge status={detail.etat} /></div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Clôture</div>
                <div className="detail-item__value">
                  <StatusBadge
                    status={getCloture(detail, detail.emprunt).label}
                    tone={getCloture(detail, detail.emprunt).tone}
                    dot={false}
                  />
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Bon d’origine</div>
                <div className="detail-item__value mono">{detail.emprunt?.reference || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Emprunteur</div>
                <div className="detail-item__value">{detail.emprunteur?.nom || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Matériel</div>
                <div className="detail-item__value">{detail.materiel?.nom || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Quantité restituée</div>
                <div className="detail-item__value mono">{detail.quantite}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Inspecteur</div>
                <div className="detail-item__value">{detail.inspecteur}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Réception</div>
                <div className="detail-item__value">{formatDate(detail.dateRetour)}</div>
              </div>
              <div className="detail-item detail-item--full">
                <div className="detail-item__label">Rapport de contrôle</div>
                <div className="detail-item__value" style={{ fontWeight: 500 }}>
                  {detail.commentaire || 'Aucun commentaire.'}
                </div>
              </div>
            </div>

            <div className="divider" />
            <div className="insight-strip">
              <span className="insight-strip__icon">
                <Wrench size={12} />
              </span>
              <span>
                {detail.etat === 'Bon état'
                  ? 'Matériel conforme, réintégré au stock disponible.'
                  : 'Un constat qualité est requis avant remise en circulation.'}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Retours
