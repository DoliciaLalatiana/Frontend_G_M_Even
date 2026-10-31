
import { useMemo, useState } from 'react'
import {
  Boxes,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Wallet,
} from 'lucide-react'
import EmptyState from '../components/common/EmptyState'
import Field from '../components/common/Field'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import { useConfirm } from '../context/ConfirmContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { computeCategoryStats } from '../services/stockService'
import { formatCurrency, formatDate, formatNumber, todayISO } from '../utils/format'
import { getIcon } from '../utils/icons'

const ICON_OPTIONS = [
  'speaker',
  'lightbulb',
  'monitor-play',
  'construction',
  'armchair',
  'sparkles',
  'cable',
  'server',
  'package',
  'truck',
  'wrench',
  'boxes',
]

const emptyDraft = {
  nom: '',
  description: '',
  couleur: '#27D9E8',
  icone: 'package',
  responsable: '',
}

const Categories = () => {
  const {
    categories,
    materiels,
    categoriesLoading,
    categoriesError,
    loadCategories,
    addCategorie,
    updateCategorie,
    deleteCategorie,
  } = useData()

  const { pushToast } = useToast()
  const confirm = useConfirm()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const stats = useMemo(
    () => computeCategoryStats(materiels, categories),
    [categories, materiels],
  )

  const totals = useMemo(
    () => ({
      references: stats.reduce((sum, item) => sum + item.nombreReferences, 0),
      unites: stats.reduce((sum, item) => sum + item.quantiteTotale, 0),
      valeur: stats.reduce((sum, item) => sum + item.valeur, 0),
      disponibles: stats.reduce((sum, item) => sum + item.quantiteDisponible, 0),
    }),
    [stats],
  )

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft)
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (categorie) => {
    setEditing(categorie)
    setDraft({
      nom: categorie.nom || '',
      description: categorie.description || '',
      couleur: categorie.couleur || '#27D9E8',
      icone: categorie.icone || 'package',
      responsable: categorie.responsable || '',
    })
    setErrors({})
    setFormOpen(true)
  }

  const setField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()

    if (saving) return

    const next = {}

    if (!draft.nom.trim()) {
      next.nom = 'Le nom de la catégorie est requis.'
    }

    if (
      categories.some(
        (item) =>
          item.nom?.toLowerCase() === draft.nom.trim().toLowerCase() &&
          String(item.id) !== String(editing?.id),
      )
    ) {
      next.nom = 'Une catégorie porte déjà ce nom.'
    }

    setErrors(next)

    if (Object.keys(next).length) return

    const payload = {
      nom: draft.nom.trim(),
      description: draft.description.trim(),
      couleur: draft.couleur,
      icone: draft.icone,
      responsable: draft.responsable.trim(),
    }

    setSaving(true)

    try {
      const result = editing
        ? await updateCategorie(editing.id, payload)
        : await addCategorie(payload)

      if (!result?.ok) {
        pushToast({
          title: editing ? 'Modification impossible' : 'Création impossible',
          message: result?.message || 'Une erreur est survenue. Veuillez réessayer.',
          type: 'error',
        })
        return
      }

      pushToast({
        title: editing ? 'Catégorie mise à jour' : 'Catégorie créée',
        message: editing
          ? `${payload.nom} a été enregistrée.`
          : `${payload.nom} rejoint le référentiel.`,
      })

      setFormOpen(false)
      setEditing(null)
      setDraft(emptyDraft)
      setErrors({})
    } catch (error) {
      pushToast({
        title: 'Erreur',
        message: error?.message || 'Une erreur inattendue est survenue.',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (categorie) => {
    const linked =
      stats.find((item) => String(item.id) === String(categorie.id))
        ?.nombreReferences || 0

    const ok = await confirm({
      title: 'Supprimer cette catégorie ?',
      message: linked
        ? `${linked} référence(s) sont rattachées à ${categorie.nom}. Réaffectez-les avant de poursuivre.`
        : `${categorie.nom} sera définitivement retirée du référentiel.`,
      confirmLabel: 'Supprimer',
    })

    if (!ok) return

    try {
      const result = await deleteCategorie(categorie.id)

      if (!result?.ok) {
        pushToast({
          title: 'Suppression impossible',
          message: result?.message || 'Impossible de supprimer cette catégorie.',
          type: 'error',
        })
        return
      }

      pushToast({
        title: 'Catégorie supprimée',
        message: `${categorie.nom} a été retirée.`,
      })
    } catch (error) {
      pushToast({
        title: 'Erreur de suppression',
        message: error?.message || 'Une erreur inattendue est survenue.',
        type: 'error',
      })
    }
  }

  const simulateImport = () => {
    pushToast({
      title: 'Import simulé',
      message: 'Le fichier CSV sera analysé avant intégration dans l’inventaire.',
      type: 'info',
    })
  }

  const PreviewIcon = getIcon(draft.icone)

  return (
    <div className="page">
      <PageHeader
        eyebrow="Référentiel du parc"
        title="Catégories"
        subtitle="Structurez l’inventaire par famille de matériel et suivez la valeur de chaque pôle."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreate}
            disabled={categoriesLoading}
          >
            <Plus size={15} />
            Nouvelle catégorie
          </button>
        }
      />

      <div className="metrics-strip">
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--violet-light)' }}>
            <Layers size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Familles</div>
            <div className="metrics-strip__value">
              {formatNumber(categories.length)} <small>actives</small>
            </div>
          </div>
        </div>

        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--cyan)' }}>
            <Boxes size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Références</div>
            <div className="metrics-strip__value">
              {formatNumber(totals.references)} <small>SKU</small>
            </div>
          </div>
        </div>

        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--success)' }}>
            <Sparkles size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Disponibilité</div>
            <div className="metrics-strip__value">
              {totals.unites
                ? Math.round((totals.disponibles / totals.unites) * 100)
                : 0}
              % <small>du parc</small>
            </div>
          </div>
        </div>

        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--warning)' }}>
            <Wallet size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Valeur cumulée</div>
            <div className="metrics-strip__value">
              {formatCurrency(totals.valeur)}
            </div>
          </div>
        </div>
      </div>

      {categoriesLoading ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state__content">
              <p>Chargement des catégories depuis le serveur...</p>
            </div>
          </div>
        </div>
      ) : categoriesError ? (
        <div className="glass-card">
          <EmptyState
            icon={<Layers size={22} />}
            title="Impossible de charger les catégories"
            text={categoriesError}
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={loadCategories}
              >
                Réessayer
              </button>
            }
          />
        </div>
      ) : categories.length ? (
        <div className="category-grid">
          {stats.map((categorie) => {
            const Icon = getIcon(categorie.icone)

            return (
              <article
                className="category-card"
                key={categorie.id}
                style={{ '--tone': categorie.couleur }}
              >
                <div className="category-card__head">
                  <div className="category-card__icon">
                    <Icon size={18} />
                  </div>

                  <div className="category-card__actions">
                    <button
                      type="button"
                      className="btn-icon is-cyan"
                      onClick={() => openEdit(categorie)}
                      aria-label={`Modifier ${categorie.nom}`}
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      type="button"
                      className="btn-icon is-danger"
                      onClick={() => remove(categorie)}
                      aria-label={`Supprimer ${categorie.nom}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="category-card__name">{categorie.nom}</h2>
                  <p className="category-card__desc">
                    {categorie.description || 'Aucune description renseignée.'}
                  </p>
                </div>

                <div className="category-card__stats">
                  <div className="category-card__stat">
                    <div className="category-card__stat-label">Réf.</div>
                    <div className="category-card__stat-value">
                      {categorie.nombreReferences}
                    </div>
                  </div>

                  <div className="category-card__stat">
                    <div className="category-card__stat-label">Unités</div>
                    <div className="category-card__stat-value">
                      {formatNumber(categorie.quantiteTotale)}
                    </div>
                  </div>

                  <div className="category-card__stat">
                    <div className="category-card__stat-label">Dispo</div>
                    <div className="category-card__stat-value">
                      {categorie.tauxDisponibilite}%
                    </div>
                  </div>
                </div>

                <div className="category-card__foot">
                  <span className="category-card__owner">
                    <UserRound size={11} />
                    <span>{categorie.responsable || 'Non assigné'}</span>
                  </span>
                  <span>MAJ {formatDate(categorie.maj)}</span>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="glass-card">
          <EmptyState
            icon={<Layers size={22} />}
            title="Aucune catégorie"
            text="Créez votre première famille de matériel pour structurer l’inventaire."
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openCreate}
              >
                <FolderPlus size={14} />
                Créer une catégorie
              </button>
            }
          />
        </div>
      )}

      <div className="upload-banner">
        <div className="upload-banner__left">
          <span className="icon-tile" style={{ '--tone': 'var(--violet-light)' }}>
            <Upload size={16} />
          </span>
          <div>
            <div className="upload-banner__title">Import de référentiel</div>
            <div className="upload-banner__text">
              Ajoutez plusieurs familles depuis un fichier CSV normalisé (nom,
              description, couleur).
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={simulateImport}
        >
          <Upload size={13} />
          Importer un fichier
        </button>
      </div>

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        subtitle="Les couleurs et icônes sont utilisées dans tout l’inventaire."
        icon={<Layers size={16} />}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Annuler
            </button>

            <button
              type="submit"
              form="categorie-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving
                ? 'Enregistrement...'
                : editing
                  ? 'Enregistrer'
                  : 'Créer la catégorie'}
            </button>
          </>
        }
      >
        <form id="categorie-form" className="form" onSubmit={submit}>
          <div className="form-grid">
            <Field
              label="Nom"
              htmlFor="cat-nom"
              required
              error={errors.nom}
              className="span-2"
            >
              <input
                id="cat-nom"
                type="text"
                value={draft.nom}
                onChange={(event) => setField('nom', event.target.value)}
                placeholder="Ex. Sonorisation"
                disabled={saving}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="cat-desc"
              className="span-2"
            >
              <textarea
                id="cat-desc"
                value={draft.description}
                onChange={(event) => setField('description', event.target.value)}
                placeholder="Rôle de cette famille dans le parc matériel…"
                disabled={saving}
              />
            </Field>

            <Field label="Couleur" htmlFor="cat-color">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="cat-color"
                  type="color"
                  value={draft.couleur}
                  onChange={(event) => setField('couleur', event.target.value)}
                  disabled={saving}
                  style={{
                    width: 46,
                    minHeight: 37,
                    padding: 4,
                    cursor: 'pointer',
                  }}
                />
                <span className="mono" style={{ fontSize: 11 }}>
                  {draft.couleur}
                </span>
              </div>
            </Field>

            <Field label="Icône" htmlFor="cat-icon">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="icon-tile" style={{ '--tone': draft.couleur }}>
                  <PreviewIcon size={16} />
                </span>

                <select
                  id="cat-icon"
                  value={draft.icone}
                  onChange={(event) => setField('icone', event.target.value)}
                  disabled={saving}
                >
                  {ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field
              label="Responsable"
              htmlFor="cat-owner"
              className="span-2"
            >
              <input
                id="cat-owner"
                type="text"
                value={draft.responsable}
                onChange={(event) => setField('responsable', event.target.value)}
                placeholder="Nom du responsable de la famille"
                disabled={saving}
              />
            </Field>
          </div>

          <div className="insight-strip">
            <span className="insight-strip__icon">
              <Sparkles size={12} />
            </span>
            <span>
              Dernière mise à jour :{' '}
              <strong>{formatDate(editing?.maj || todayISO())}</strong>
            </span>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Categories
