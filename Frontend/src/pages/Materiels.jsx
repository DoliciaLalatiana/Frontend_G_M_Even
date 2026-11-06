import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Boxes,
  CheckCircle2,
  Download,
  Eye,
  MapPin,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Wallet,
  Wrench,
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
import {
  computeCategoryStats,
  computeEmpruntResume,
  getStockFaible,
} from '../services/stockService'
import {
  ETATS_MATERIEL,
  PAGE_SIZE,
  STATUT_TONE,
} from '../utils/constants'
import {
  formatCurrency,
  formatDate,
  formatNumber,
  todayISO,
} from '../utils/format'
import { getIcon } from '../utils/icons'

const emptyDraft = {
  nom: '',
  reference: '',
  categorieId: '',
  marque: '',
  quantiteTotale: 1,
  quantiteDisponible: 1,
  etat: 'Bon état',
  emplacement: 'Dépôt central — Paris',
  valeur: 0,
  dateAcquisition: todayISO(),
  notes: '',
}

const Materiels = () => {
  const { materiels, categories, emprunts, addMateriel, updateMateriel, deleteMateriel, parametres } =
    useData()
  const { pushToast } = useToast()
  const confirm = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('search') || '')
  const [categorie, setCategorie] = useState('')
  const [etat, setEtat] = useState('')
  const [quickFilter, setQuickFilter] = useState('all')
  const debounced = useDebounce(query, 200)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [errors, setErrors] = useState({})
  const [detail, setDetail] = useState(null)

  const seuil = parametres?.stock?.seuilAlerte || 25
  const stockFaible = useMemo(() => getStockFaible(materiels, seuil), [materiels, seuil])
  const stockFaibleIds = useMemo(() => new Set(stockFaible.map((item) => item.id)), [stockFaible])

  const stats = useMemo(() => {
    const total = materiels.reduce((sum, item) => sum + Number(item.quantiteTotale || 0), 0)
    const disponibles = materiels.reduce(
      (sum, item) => sum + Number(item.quantiteDisponible || 0),
      0,
    )
    const valeur = materiels.reduce(
      (sum, item) => sum + Number(item.valeur || 0) * Number(item.quantiteTotale || 0),
      0,
    )
    return {
      references: materiels.length,
      total,
      disponibles,
      valeur,
      atelier: materiels.filter((item) => item.etat !== 'Bon état').length,
    }
  }, [materiels])

  const filterCounts = useMemo(
    () => ({
      all: materiels.length,
      dispo: materiels.filter(
        (item) => item.quantiteDisponible > 0 && !stockFaibleIds.has(item.id),
      ).length,
      faible: materiels.filter((item) => stockFaibleIds.has(item.id)).length,
      atelier: materiels.filter((item) => item.etat !== 'Bon état').length,
    }),
    [materiels, stockFaibleIds],
  )

  useEffect(() => {
    const param = searchParams.get('search')
    if (param !== null) setQuery(param)
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null)
      setDraft({ ...emptyDraft, categorieId: categories[0]?.id || '' })
      setErrors({})
      setFormOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase()
    return materiels.filter((materiel) => {
      if (categorie && materiel.categorieId !== categorie) return false
      if (etat && materiel.etat !== etat) return false
      if (quickFilter === 'dispo' && (materiel.quantiteDisponible === 0 || stockFaibleIds.has(materiel.id)))
        return false
      if (quickFilter === 'faible' && !stockFaibleIds.has(materiel.id)) return false
      if (quickFilter === 'atelier' && materiel.etat === 'Bon état') return false
      if (!term) return true
      return [materiel.nom, materiel.reference, materiel.marque, materiel.emplacement]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    })
  }, [categorie, debounced, etat, materiels, quickFilter, stockFaibleIds])

  const categoryName = (id) => categories.find((item) => item.id === id)?.nom || 'Sans catégorie'
  const categoryTone = (id) => categories.find((item) => item.id === id)?.couleur || 'var(--cyan)'

  const openCreate = () => {
    setEditing(null)
    setDraft({ ...emptyDraft, categorieId: categories[0]?.id || '' })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (materiel) => {
    setEditing(materiel)
    setDraft({
      nom: materiel.nom,
      reference: materiel.reference,
      categorieId: materiel.categorieId,
      marque: materiel.marque || '',
      quantiteTotale: materiel.quantiteTotale,
      quantiteDisponible: materiel.quantiteDisponible,
      etat: materiel.etat,
      emplacement: materiel.emplacement || '',
      valeur: materiel.valeur || 0,
      dateAcquisition: materiel.dateAcquisition || todayISO(),
      notes: materiel.notes || '',
    })
    setErrors({})
    setFormOpen(true)
  }

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const validate = () => {
    const next = {}
    const total = Number(draft.quantiteTotale)
    const disponible = Number(draft.quantiteDisponible)
    if (!draft.nom.trim()) next.nom = 'Le nom du matériel est requis.'
    if (!draft.reference.trim()) next.reference = 'La référence est requise.'
    if (!draft.categorieId) next.categorieId = 'Sélectionnez une catégorie.'
    if (!Number.isFinite(total) || total < 1) next.quantiteTotale = 'La quantité doit être supérieure à 0.'
    if (!Number.isFinite(disponible) || disponible < 0) next.quantiteDisponible = 'Quantité invalide.'
    if (disponible > total) next.quantiteDisponible = 'La disponibilité ne peut pas dépasser le total.'
    if (
      materiels.some(
        (item) =>
          item.reference.toLowerCase() === draft.reference.trim().toLowerCase() &&
          item.id !== editing?.id,
      )
    ) {
      next.reference = 'Cette référence est déjà utilisée.'
    }
    if (editing) {
      const engage = editing.quantiteTotale - editing.quantiteDisponible
      if (total < engage) {
        next.quantiteTotale = `Impossible : ${engage} unité(s) sont engagées en emprunt.`
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    const payload = {
      ...draft,
      nom: draft.nom.trim(),
      reference: draft.reference.trim().toUpperCase(),
      marque: draft.marque.trim(),
      emplacement: draft.emplacement.trim(),
      quantiteTotale: Number(draft.quantiteTotale),
      quantiteDisponible: Number(draft.quantiteDisponible),
      valeur: Number(draft.valeur) || 0,
      notes: draft.notes.trim(),
    }
    const result = editing ? await updateMateriel(editing.id, payload) : await addMateriel(payload)
    if (result?.ok === false) {
      pushToast({ title: 'Enregistrement impossible', message: result.message, type: 'error' })
      return
    }
    if (editing) {
      pushToast({ title: 'Matériel mis à jour', message: `${payload.nom} a été enregistré.` })
    } else {
      pushToast({ title: 'Matériel créé', message: `${payload.nom} rejoint l’inventaire.` })
    }
    setFormOpen(false)
    setDetail(null)
  }

  const remove = async (materiel) => {
    const ok = await confirm({
      title: 'Supprimer ce matériel ?',
      message: `${materiel.nom} (${materiel.reference}) sera retiré de l’inventaire. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
    })
    if (!ok) return
    const result = await deleteMateriel(materiel.id)
    if (!result?.ok) {
      pushToast({ title: 'Suppression impossible', message: result?.message, type: 'error' })
      return
    }
    setDetail(null)
    pushToast({ title: 'Matériel supprimé', message: `${materiel.nom} a été retiré.` })
  }

  const exportCsv = () => {
    const header = ['Référence', 'Nom', 'Catégorie', 'Marque', 'Total', 'Disponible', 'État', 'Emplacement', 'Valeur unitaire']
    const lines = filtered.map((item) => [
      item.reference,
      item.nom,
      categoryName(item.categorieId),
      item.marque,
      item.quantiteTotale,
      item.quantiteDisponible,
      item.etat,
      item.emplacement,
      item.valeur,
    ])
    const csv = [header, ...lines]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventaire-materiels-${todayISO()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    pushToast({ title: 'Export terminé', message: `${filtered.length} lignes exportées en CSV.` })
  }

  const activeLoans = useMemo(() => {
    if (!detail) return []
    return emprunts
      .filter(
        (emprunt) =>
          emprunt.statut !== 'Retourné' &&
          emprunt.lignes.some((ligne) => ligne.materielId === detail.id),
      )
      .map((emprunt) => ({
        emprunt,
        quantite: emprunt.lignes
          .filter((ligne) => ligne.materielId === detail.id)
          .reduce((sum, ligne) => sum + ligne.quantite, 0),
      }))
  }, [detail, emprunts])

  const columns = [
    {
      key: 'nom',
      label: 'Matériel',
      render: (row) => {
        const Icon = getIcon(categories.find((item) => item.id === row.categorieId)?.icone || 'package')
        return (
          <div className="table-entity">
            <span
              className="table-thumb"
              style={{ '--thumb-tone': categoryTone(row.categorieId) }}
            >
              <Icon size={16} />
            </span>
            <div className="materiel-name-cell" style={{ minWidth: 0 }}>
              <div className="cell-main">{row.nom}</div>
              <div className="cell-sub mono">{row.reference} · {row.marque || '—'}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'categorie',
      label: 'Catégorie',
      render: (row) => (
        <div>
          <div className="cell-main">{categoryName(row.categorieId)}</div>
          <div className="cell-sub">{row.emplacement}</div>
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (row) => {
        const ratio = row.quantiteTotale ? Math.round((row.quantiteDisponible / row.quantiteTotale) * 100) : 0
        const tone = ratio <= 25 ? 'var(--danger)' : ratio <= 50 ? 'var(--warning)' : 'var(--success)'
        return (
          <div className="stock-cell">
            <div className="stock-cell__row">
              <span>
                <strong className="stock-cell__value">{row.quantiteDisponible}</strong> / {row.quantiteTotale}
              </span>
              <span className="availability-pill">{ratio}%</span>
            </div>
            <div className="progress progress--sm">
              <div className="progress__bar" style={{ width: `${ratio}%`, '--tone': tone }} />
            </div>
          </div>
        )
      },
    },
    {
      key: 'etat',
      label: 'État',
      render: (row) => <StatusBadge status={row.etat} />,
    },
    {
      key: 'valeur',
      label: 'Valeur',
      align: 'right',
      render: (row) => (
        <div className="text-right">
          <div className="cell-mono">{formatCurrency(row.valeur)}</div>
          <div className="cell-sub">l’unité</div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <div className="table-actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="btn-icon is-cyan" onClick={() => setDetail(row)} aria-label="Voir le matériel">
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

  const categoryStats = useMemo(
    () =>
      computeCategoryStats(materiels, categories)
        .filter((item) => item.nombreReferences > 0)
        .sort((a, b) => a.tauxDisponibilite - b.tauxDisponibilite)
        .slice(0, 5),
    [categories, materiels],
  )

  return (
    <div className="page">
      <PageHeader
        eyebrow="Inventaire & disponibilité"
        title="Matériels"
        subtitle="Pilotez les références, les quantités disponibles et l’état du parc en temps réel."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={exportCsv}>
              <Download size={14} />
              Exporter CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={15} />
              Nouveau matériel
            </button>
          </>
        }
      />

      <div className="telemetry-strip">
        <div className="telemetry-cell">
          <span className="telemetry-cell__icon" style={{ '--tone': 'var(--violet-light)' }}>
            <Package size={15} />
          </span>
          <div>
            <div className="telemetry-cell__label">Références</div>
            <div className="telemetry-cell__value">
              {formatNumber(stats.references)} <small>SKU</small>
            </div>
          </div>
        </div>
        <div className="telemetry-cell">
          <span className="telemetry-cell__icon" style={{ '--tone': 'var(--cyan)' }}>
            <Boxes size={15} />
          </span>
          <div>
            <div className="telemetry-cell__label">Unités totales</div>
            <div className="telemetry-cell__value">
              {formatNumber(stats.total)} <small>unités</small>
            </div>
          </div>
        </div>
        <div className="telemetry-cell">
          <span className="telemetry-cell__icon" style={{ '--tone': 'var(--success)' }}>
            <CheckCircle2 size={15} />
          </span>
          <div>
            <div className="telemetry-cell__label">Disponibles</div>
            <div className="telemetry-cell__value">
              {formatNumber(stats.disponibles)}{' '}
              <small>{stats.total ? Math.round((stats.disponibles / stats.total) * 100) : 0}%</small>
            </div>
          </div>
        </div>
        <div className="telemetry-cell">
          <span className="telemetry-cell__icon" style={{ '--tone': 'var(--warning)' }}>
            <Wallet size={15} />
          </span>
          <div>
            <div className="telemetry-cell__label">Valeur du parc</div>
            <div className="telemetry-cell__value">{formatCurrency(stats.valeur)}</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Rechercher une référence, un nom, une marque…"
            ariaLabel="Rechercher un matériel"
          />
        </div>
        <div className="toolbar__group">
          <FilterSelect
            value={categorie}
            onChange={setCategorie}
            label="Catégorie"
            allLabel="Toutes les catégories"
            options={categories.map((item) => ({ value: item.id, label: item.nom }))}
          />
          <FilterSelect
            value={etat}
            onChange={setEtat}
            label="État"
            allLabel="Tous les états"
            options={ETATS_MATERIEL}
          />
          <span className="toolbar__count">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="filter-pills">
        {[
          { key: 'all', label: 'Tous', count: filterCounts.all },
          { key: 'dispo', label: 'Disponibles', count: filterCounts.dispo },
          { key: 'faible', label: 'Stock faible', count: filterCounts.faible },
          { key: 'atelier', label: 'Atelier', count: filterCounts.atelier },
        ].map((item) => (
          <button
            type="button"
            key={item.key}
            className={`pill ${quickFilter === item.key ? 'is-active' : ''}`.trim()}
            onClick={() => setQuickFilter(item.key)}
          >
            {item.label}
            <span className="pill__count">{item.count}</span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={PAGE_SIZE}
        onRowClick={(row) => setDetail(row)}
        emptyTitle="Aucun matériel trouvé"
        emptyText="Ajustez la recherche ou les filtres, ou créez une nouvelle référence."
        emptyIcon={<PackagePlus size={22} />}
        emptyAction={
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={14} />
            Ajouter un matériel
          </button>
        }
        footer={
          <span>
            {formatNumber(filtered.reduce((sum, item) => sum + item.quantiteDisponible, 0))} unités disponibles sur{' '}
            {formatNumber(filtered.reduce((sum, item) => sum + item.quantiteTotale, 0))}
          </span>
        }
      />

      <div className="quick-panels">
        <div className="glass-card">
          <div className="card-head">
            <div>
              <div className="card-head__title">
                <MapPin size={14} className="text-cyan" />
                Occupation des baies
              </div>
              <p className="card-head__subtitle">Vue synthétique des emplacements du dépôt central</p>
            </div>
            <span className="badge badge--cyan">Dépôt central</span>
          </div>
          <div className="rack-grid">
            {Array.from({ length: 40 }, (_, index) => {
              const materiel = materiels[index % Math.max(materiels.length, 1)]
              if (!materiel) return <div className="rack-cell is-empty" key={index}>—</div>
              const ratio = materiel.quantiteTotale
                ? materiel.quantiteDisponible / materiel.quantiteTotale
                : 0
              const state =
                materiel.etat !== 'Bon état' || ratio <= 0.2
                  ? 'is-danger'
                  : ratio <= 0.45
                    ? 'is-warning'
                    : ''
              return (
                <div className={`rack-cell ${state}`.trim()} key={index} title={materiel.nom}>
                  {String(index + 1).padStart(2, '0')}
                </div>
              )
            })}
          </div>
          <div className="rack-legend">
            <span><i style={{ background: 'rgba(39,217,232,.5)' }} /> Disponible</span>
            <span><i style={{ background: 'rgba(255,183,67,.6)' }} /> Stock faible</span>
            <span><i style={{ background: 'rgba(255,75,114,.6)' }} /> Atelier / critique</span>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-head">
            <div>
              <div className="card-head__title">
                <Wrench size={14} className="text-warning" />
                Disponibilité par famille
              </div>
              <p className="card-head__subtitle">Familles les plus sous tension</p>
            </div>
            <span className="badge badge--warning">{stats.atelier} en atelier</span>
          </div>
          <div className="gauge-list">
            {categoryStats.map((item) => (
              <div key={item.id}>
                <div className="gauge-row__head">
                  <span>{item.nom}</span>
                  <strong>{item.tauxDisponibilite}%</strong>
                </div>
                <div className="progress">
                  <div
                    className="progress__bar"
                    style={{
                      width: `${item.tauxDisponibilite}%`,
                      '--tone': item.tauxDisponibilite < 40 ? 'var(--danger)' : item.tauxDisponibilite < 65 ? 'var(--warning)' : 'var(--success)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="quick-inline">
            <span>Seuil d’alerte stock : {seuil}%</span>
            <span className="quick-inline__link">
              <TriangleAlert size={11} /> {stockFaible.length} référence(s) à surveiller
            </span>
          </div>
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier le matériel' : 'Nouveau matériel'}
        subtitle={editing ? `${editing.reference} · mise à jour de l’inventaire` : 'Ajouter une référence au parc matériel'}
        icon={<PackagePlus size={16} />}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button type="submit" form="materiel-form" className="btn btn-primary">
              {editing ? 'Enregistrer' : 'Créer le matériel'}
            </button>
          </>
        }
      >
        <form id="materiel-form" className="form" onSubmit={submit}>
          <div className="form-section">
            <div className="form-section__head">
              <span className="form-section__num">01</span>
              <div>
                <div className="form-section__title">Identification</div>
                <div className="form-section__hint">Nom, référence et famille de matériel.</div>
              </div>
            </div>
            <div className="form-grid">
              <Field label="Nom du matériel" htmlFor="mat-nom" required error={errors.nom} className="span-2">
                <input
                  id="mat-nom"
                  type="text"
                  value={draft.nom}
                  onChange={(event) => setField('nom', event.target.value)}
                  placeholder="Ex. Line Array L-Acoustics K2"
                />
              </Field>
              <Field label="Référence interne" htmlFor="mat-ref" required error={errors.reference}>
                <input
                  id="mat-ref"
                  type="text"
                  value={draft.reference}
                  onChange={(event) => setField('reference', event.target.value)}
                  placeholder="SON-K2-001"
                />
              </Field>
              <Field label="Catégorie" htmlFor="mat-cat" required error={errors.categorieId}>
                <select
                  id="mat-cat"
                  value={draft.categorieId}
                  onChange={(event) => setField('categorieId', event.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nom}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Marque" htmlFor="mat-marque">
                <input
                  id="mat-marque"
                  type="text"
                  value={draft.marque}
                  onChange={(event) => setField('marque', event.target.value)}
                  placeholder="L-Acoustics"
                />
              </Field>
              <Field label="Emplacement" htmlFor="mat-emp">
                <input
                  id="mat-emp"
                  type="text"
                  value={draft.emplacement}
                  onChange={(event) => setField('emplacement', event.target.value)}
                  placeholder="Baie A01"
                />
              </Field>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__head">
              <span className="form-section__num">02</span>
              <div>
                <div className="form-section__title">Stock & état</div>
                <div className="form-section__hint">Les quantités disponibles sont engagées dans les emprunts.</div>
              </div>
            </div>
            <div className="form-grid form-grid--3">
              <Field label="Quantité totale" htmlFor="mat-total" required error={errors.quantiteTotale}>
                <input
                  id="mat-total"
                  type="number"
                  min="1"
                  value={draft.quantiteTotale}
                  onChange={(event) => setField('quantiteTotale', event.target.value)}
                />
              </Field>
              <Field label="Disponible" htmlFor="mat-dispo" required error={errors.quantiteDisponible}>
                <input
                  id="mat-dispo"
                  type="number"
                  min="0"
                  value={draft.quantiteDisponible}
                  onChange={(event) => setField('quantiteDisponible', event.target.value)}
                />
              </Field>
              <Field label="État" htmlFor="mat-etat">
                <select id="mat-etat" value={draft.etat} onChange={(event) => setField('etat', event.target.value)}>
                  {ETATS_MATERIEL.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Valeur unitaire (€)" htmlFor="mat-valeur">
                <input
                  id="mat-valeur"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.valeur}
                  onChange={(event) => setField('valeur', event.target.value)}
                />
              </Field>
              <Field label="Date d’acquisition" htmlFor="mat-date">
                <input
                  id="mat-date"
                  type="date"
                  value={draft.dateAcquisition}
                  onChange={(event) => setField('dateAcquisition', event.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__head">
              <span className="form-section__num">03</span>
              <div>
                <div className="form-section__title">Notes techniques</div>
                <div className="form-section__hint">Consignes de contrôle, maintenance ou transport.</div>
              </div>
            </div>
            <Field label="Notes" htmlFor="mat-notes">
              <textarea
                id="mat-notes"
                value={draft.notes}
                onChange={(event) => setField('notes', event.target.value)}
                placeholder="Consignes particulières, historique de maintenance…"
              />
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.nom || 'Détail du matériel'}
        subtitle={detail ? `${detail.reference} · ${categoryName(detail.categorieId)}` : undefined}
        icon={<Package size={16} />}
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
              <button type="button" className="btn btn-primary" onClick={() => setDetail(null)}>
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
                <div className="detail-item__label">Disponibilité</div>
                <div className="detail-item__value">
                  {detail.quantiteDisponible} / {detail.quantiteTotale} unités
                </div>
                <div className="progress progress--sm" style={{ marginTop: 7 }}>
                  <div
                    className="progress__bar"
                    style={{
                      width: `${detail.quantiteTotale ? (detail.quantiteDisponible / detail.quantiteTotale) * 100 : 0}%`,
                      '--tone': STATUT_TONE(detail.etat) === 'danger' ? 'var(--danger)' : 'var(--cyan)',
                    }}
                  />
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">État</div>
                <div className="detail-item__value">
                  <StatusBadge status={detail.etat} />
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Marque</div>
                <div className="detail-item__value">{detail.marque || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Emplacement</div>
                <div className="detail-item__value">{detail.emplacement || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Valeur unitaire</div>
                <div className="detail-item__value mono">{formatCurrency(detail.valeur)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Acquisition</div>
                <div className="detail-item__value">{formatDate(detail.dateAcquisition)}</div>
              </div>
              <div className="detail-item detail-item--full">
                <div className="detail-item__label">Notes</div>
                <div className="detail-item__value" style={{ fontWeight: 500 }}>
                  {detail.notes || 'Aucune note particulière.'}
                </div>
              </div>
            </div>

            <div className="divider" />

            <div>
              <div className="card-head">
                <div>
                  <div className="card-head__title">Emprunts en cours</div>
                  <p className="card-head__subtitle">{activeLoans.length} bon(s) mobilisant ce matériel</p>
                </div>
                <span className="badge badge--cyan">{activeLoans.reduce((sum, item) => sum + item.quantite, 0)} unités</span>
              </div>

              {activeLoans.length ? (
                <div className="detail-list">
                  {activeLoans.map(({ emprunt, quantite }) => (
                    <div className="detail-list__row" key={emprunt.id}>
                      <span className="detail-list__label">
                        <Package size={12} />
                        {emprunt.reference} · {quantite} unité(s)
                      </span>
                      <span className="detail-list__value">
                        <StatusBadge status={emprunt.statut} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="insight-strip">
                  <span className="insight-strip__icon">
                    <CheckCircle2 size={12} />
                  </span>
                  <span>Ce matériel est entièrement disponible au dépôt.</span>
                </div>
              )}

              {activeLoans.length > 0 && (
                <p className="field__hint" style={{ marginTop: 8 }}>
                  {computeEmpruntResume(activeLoans[0].emprunt, materiels).quantite} unités engagées sur le dernier bon.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Materiels
