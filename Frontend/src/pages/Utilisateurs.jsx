import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CalendarDays,
  Fingerprint,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRoundCog,
  Users,
  Wrench,
} from 'lucide-react'
import DataTable from '../components/common/DataTable'
import EmptyState from '../components/common/EmptyState'
import Field from '../components/common/Field'
import FilterSelect from '../components/common/FilterSelect'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import SearchBar from '../components/common/SearchBar'
import StatusBadge from '../components/common/StatusBadge'
import { useConfirm } from '../context/ConfirmContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  HABILITATIONS,
  PAGE_SIZE,
  ROLES_UTILISATEUR,
  STATUTS_UTILISATEUR,
} from '../utils/constants'
import { formatDate, formatNumber, initials, todayISO } from '../utils/format'

const HABILITATION_HINTS = {
  Inventaire: 'Comptage, entrées et sorties du parc',
  Validation: 'Signature des bons et validations de mouvement',
  'Départ matériel': 'Autorisation de sortie du dépôt',
  'Retour matériel': 'Réintégration et contrôle qualité',
  Maintenance: 'Ouverture et clôture des tickets SAV',
  Administration: 'Gestion des comptes et paramètres',
  RH: 'Accès aux dossiers du personnel',
}

const emptyDraft = {
  nom: '',
  email: '',
  telephone: '',
  role: 'Technicien',
  statut: 'Actif',
  affectation: '',
  dateEntree: todayISO(),
  habilitations: [],
}

const toneForName = (name = '') => {
  const tones = ['var(--violet)', 'var(--cyan)', 'var(--blue)', 'var(--success)']
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0)
  return tones[sum % tones.length]
}

const Utilisateurs = () => {
  const {
    utilisateurs,
    emprunts,
    evenements,
    addUtilisateur,
    updateUtilisateur,
    deleteUtilisateur,
  } = useData()
  const { pushToast } = useToast()
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [selectedId, setSelectedId] = useState(utilisateurs[0]?.id || '')
  const [detail, setDetail] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [errors, setErrors] = useState({})
  const [rightsDraft, setRightsDraft] = useState({ role: '', statut: 'Actif', habilitations: [] })

  const selected = useMemo(
    () => utilisateurs.find((item) => item.id === selectedId) || null,
    [selectedId, utilisateurs],
  )

  useEffect(() => {
    if (!utilisateurs.length) {
      setSelectedId('')
      return
    }
    if (!utilisateurs.some((item) => item.id === selectedId)) {
      setSelectedId(utilisateurs[0].id)
    }
  }, [selectedId, utilisateurs])

  useEffect(() => {
    if (!selected) {
      setRightsDraft({ role: '', statut: 'Actif', habilitations: [] })
      return
    }
    setRightsDraft({
      role: selected.role,
      statut: selected.statut,
      habilitations: [...(selected.habilitations || [])],
    })
  }, [selected])

  const evenementById = useMemo(
    () => Object.fromEntries(evenements.map((item) => [item.id, item])),
    [evenements],
  )

  const loansByUser = useMemo(() => {
    const map = {}
    emprunts.forEach((emprunt) => {
      if (!map[emprunt.emprunteurId]) {
        map[emprunt.emprunteurId] = { total: 0, actifs: [] }
      }
      map[emprunt.emprunteurId].total += 1
      if (emprunt.statut !== 'Retourné') {
        map[emprunt.emprunteurId].actifs.push(emprunt)
      }
    })
    return map
  }, [emprunts])

  const metrics = useMemo(() => {
    const actifs = utilisateurs.filter((item) => item.statut === 'Actif').length
    const encadrement = utilisateurs.filter(
      (item) => item.role === 'Régisseur' || item.role === 'Administrateur',
    ).length
    const techniciens = utilisateurs.filter((item) => item.role === 'Technicien').length
    return {
      total: utilisateurs.length,
      actifs,
      encadrement,
      techniciens,
      inactifs: utilisateurs.length - actifs,
    }
  }, [utilisateurs])

  const roleCounts = useMemo(() => {
    const counts = Object.fromEntries(ROLES_UTILISATEUR.map((role) => [role, 0]))
    utilisateurs.forEach((item) => {
      counts[item.role] = (counts[item.role] || 0) + 1
    })
    return counts
  }, [utilisateurs])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return utilisateurs.filter((item) => {
      if (roleFilter && item.role !== roleFilter) return false
      if (statutFilter && item.statut !== statutFilter) return false
      if (!query) return true
      return [item.nom, item.email, item.telephone, item.affectation, item.role, ...(item.habilitations || [])]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [roleFilter, search, statutFilter, utilisateurs])

  const rightsDirty =
    selected &&
    (rightsDraft.role !== selected.role ||
      rightsDraft.statut !== selected.statut ||
      [...rightsDraft.habilitations].sort().join('|') !==
        [...(selected.habilitations || [])].sort().join('|'))

  const openCreate = () => {
    setEditing(null)
    setDraft({ ...emptyDraft, dateEntree: todayISO() })
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (utilisateur) => {
    setDetail(null)
    setEditing(utilisateur)
    setDraft({
      nom: utilisateur.nom,
      email: utilisateur.email,
      telephone: utilisateur.telephone || '',
      role: utilisateur.role,
      statut: utilisateur.statut,
      affectation: utilisateur.affectation || '',
      dateEntree: utilisateur.dateEntree || todayISO(),
      habilitations: [...(utilisateur.habilitations || [])],
    })
    setErrors({})
    setFormOpen(true)
  }

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const toggleHabilitation = (habilitation) => {
    setDraft((current) => {
      const exists = current.habilitations.includes(habilitation)
      return {
        ...current,
        habilitations: exists
          ? current.habilitations.filter((item) => item !== habilitation)
          : [...current.habilitations, habilitation],
      }
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!draft.nom.trim()) next.nom = 'Le nom complet est requis.'
    if (!draft.email.trim()) next.email = "L'adresse e-mail est requise."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      next.email = 'Adresse e-mail invalide.'
    } else if (
      utilisateurs.some(
        (item) => item.email.toLowerCase() === draft.email.trim().toLowerCase() && item.id !== editing?.id,
      )
    ) {
      next.email = 'Un compte utilise déjà cette adresse e-mail.'
    }
    if (!draft.role) next.role = 'Sélectionnez un rôle.'
    if (!draft.dateEntree) next.dateEntree = "La date d'entrée est requise."
    setErrors(next)
    if (Object.keys(next).length) return

    const payload = {
      nom: draft.nom.trim(),
      email: draft.email.trim().toLowerCase(),
      telephone: draft.telephone.trim(),
      role: draft.role,
      statut: draft.statut,
      affectation: draft.affectation.trim(),
      dateEntree: draft.dateEntree,
      habilitations: draft.habilitations,
    }

    if (editing) {
      const result = await updateUtilisateur(editing.id, payload)
      if (result?.ok === false) {
        pushToast({ title: 'Mise à jour impossible', message: result.message, type: 'error' })
        return
      }
      pushToast({ title: 'Compte mis à jour', message: `${payload.nom} dispose désormais du rôle ${payload.role}.` })
    } else {
      const created = await addUtilisateur(payload)
      if (created?.ok === false) {
        pushToast({ title: 'Création impossible', message: created.message, type: 'error' })
        return
      }
      if (created?.id) setSelectedId(created.id)
      pushToast({ title: 'Utilisateur ajouté', message: `${payload.nom} rejoint le registre des accréditations.` })
    }
    setFormOpen(false)
  }

  const remove = async (utilisateur) => {
    const actifs = loansByUser[utilisateur.id]?.actifs.length || 0
    const ok = await confirm({
      title: 'Supprimer ce compte ?',
      message: actifs
        ? `${utilisateur.nom} possède ${actifs} emprunt(s) actif(s). Le compte ne pourra pas être supprimé tant que le matériel est engagé.`
        : `${utilisateur.nom} sera définitivement retiré du registre. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    })
    if (!ok) return
    const result = await deleteUtilisateur(utilisateur.id)
    if (!result?.ok) {
      pushToast({ title: 'Suppression impossible', message: result?.message, type: 'error' })
      return
    }
    setDetail(null)
    pushToast({ title: 'Compte supprimé', message: `${utilisateur.nom} a été retiré du registre.` })
  }

  const toggleRight = (habilitation) => {
    setRightsDraft((current) => {
      const exists = current.habilitations.includes(habilitation)
      return {
        ...current,
        habilitations: exists
          ? current.habilitations.filter((item) => item !== habilitation)
          : [...current.habilitations, habilitation],
      }
    })
  }

  const saveRights = async () => {
    if (!selected) return
    const result = await updateUtilisateur(selected.id, {
      role: rightsDraft.role,
      statut: rightsDraft.statut,
      habilitations: rightsDraft.habilitations,
    })
    if (result?.ok === false) {
      pushToast({ title: 'Enregistrement impossible', message: result.message, type: 'error' })
      return
    }
    pushToast({
      title: 'Droits enregistrés',
      message: `Les accès de ${selected.nom} ont été actualisés.`,
    })
  }

  const revokeRights = async () => {
    if (!selected) return
    const ok = await confirm({
      title: 'Révoquer les habilitations ?',
      message: `Toutes les habilitations dépôt de ${selected.nom} seront retirées. Le rôle sera conservé.`,
      confirmLabel: 'Révoquer',
      tone: 'danger',
    })
    if (!ok) return
    const result = await updateUtilisateur(selected.id, { habilitations: [] })
    if (result?.ok === false) {
      pushToast({ title: 'Révocation impossible', message: result.message, type: 'error' })
      return
    }
    setRightsDraft((current) => ({ ...current, habilitations: [] }))
    pushToast({ title: 'Habilitations révoquées', message: `${selected.nom} n’a plus d’accès dépôt.`, type: 'warning' })
  }

  const columns = [
    {
      key: 'nom',
      label: 'Utilisateur',
      render: (row) => (
        <div className="user-cell">
          <span className="avatar" style={{ '--tone': toneForName(row.nom) }}>{initials(row.nom)}</span>
          <div style={{ minWidth: 0 }}>
            <div className="user-cell__name">{row.nom}</div>
            <div className="user-cell__email">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (row) => <StatusBadge status={row.role} dot={false} />,
    },
    {
      key: 'affectation',
      label: 'Affectation',
      render: (row) => (
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--text)' }}>{row.affectation || 'Non affecté'}</div>
          <div className="cell-sub">{row.telephone || 'Téléphone non renseigné'}</div>
        </div>
      ),
    },
    {
      key: 'habilitations',
      label: 'Habilitations',
      render: (row) => (
        <div className="habilitation-list">
          {(row.habilitations || []).slice(0, 3).map((habilitation) => (
            <span className="habilitation" key={habilitation}>{habilitation}</span>
          ))}
          {(row.habilitations || []).length > 3 && (
            <span className="habilitation">+{row.habilitations.length - 3}</span>
          )}
          {!row.habilitations?.length && <span className="cell-sub">Aucun accès dépôt</span>}
        </div>
      ),
    },
    {
      key: 'emprunts',
      label: 'Emprunts',
      align: 'center',
      render: (row) => {
        const stats = loansByUser[row.id] || { total: 0, actifs: [] }
        return (
          <div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text)' }}>
              {formatNumber(stats.total)}
            </div>
            <div className="cell-sub">{stats.actifs.length ? `${stats.actifs.length} actif(s)` : 'À jour'}</div>
          </div>
        )
      },
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
          <button
            type="button"
            className="btn-icon is-cyan"
            aria-label={`Droits de ${row.nom}`}
            title="Droits & habilitations"
            onClick={() => setSelectedId(row.id)}
          >
            <Fingerprint size={14} />
          </button>
          <button
            type="button"
            className="btn-icon"
            aria-label={`Modifier ${row.nom}`}
            title="Modifier"
            onClick={() => openEdit(row)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="btn-icon is-danger"
            aria-label={`Supprimer ${row.nom}`}
            title="Supprimer"
            onClick={() => remove(row)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  const detailLoans = detail ? loansByUser[detail.id]?.actifs || [] : []

  return (
    <div className="page">
      <PageHeader
        eyebrow="Contrôle d’accès · sécurité dépôt"
        title="Gestion des utilisateurs & rôles"
        subtitle="Administrez les comptes techniciens, régisseurs et prestataires, puis pilotez les habilitations du parc."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedId(utilisateurs[0]?.id || '')}>
              <ShieldCheck size={15} />
              Matrice des droits
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <UserPlus size={15} />
              Nouvel utilisateur
            </button>
          </>
        }
      />

      <div className="metrics-strip">
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--violet-light)' }}>
            <Users size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Total utilisateurs</div>
            <div className="metrics-strip__value">
              {formatNumber(metrics.total)} <small>comptes</small>
            </div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--cyan)' }}>
            <KeyRound size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Régisseurs & admins</div>
            <div className="metrics-strip__value">
              {formatNumber(metrics.encadrement)} <small>clés maîtres</small>
            </div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--blue)' }}>
            <Wrench size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Techniciens</div>
            <div className="metrics-strip__value">
              {formatNumber(metrics.techniciens)} <small>opérateurs</small>
            </div>
          </div>
        </div>
        <div className="metrics-strip__item">
          <span className="metrics-strip__icon" style={{ '--tone': 'var(--success)' }}>
            <BadgeCheck size={16} />
          </span>
          <div>
            <div className="metrics-strip__label">Comptes actifs</div>
            <div className="metrics-strip__value">
              {formatNumber(metrics.actifs)} <small>{metrics.inactifs} suspendus</small>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div className="toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Rechercher un nom, e-mail, rôle, habilitation…"
            className="toolbar__search"
          />
          <FilterSelect
            value={roleFilter}
            onChange={setRoleFilter}
            options={ROLES_UTILISATEUR}
            label="Filtrer par rôle"
            allLabel="Tous les rôles"
          />
          <FilterSelect
            value={statutFilter}
            onChange={setStatutFilter}
            options={STATUTS_UTILISATEUR}
            label="Filtrer par statut"
            allLabel="Tous les statuts"
          />
          <span className="toolbar__spacer" />
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
            {filtered.length} / {utilisateurs.length} comptes
          </span>
        </div>
        <div className="filter-pills" style={{ padding: '0 13px 11px' }}>
          <button
            type="button"
            className={`pill ${!roleFilter ? 'is-active' : ''}`}
            onClick={() => setRoleFilter('')}
          >
            Tous <span className="pill__count">{utilisateurs.length}</span>
          </button>
          {ROLES_UTILISATEUR.map((role) => (
            <button
              type="button"
              key={role}
              className={`pill ${roleFilter === role ? 'is-active' : ''}`}
              onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
            >
              {role} <span className="pill__count">{roleCounts[role] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid-8-4">
        <div style={{ minWidth: 0 }}>
          <DataTable
            columns={columns}
            rows={filtered}
            pageSize={PAGE_SIZE}
            onRowClick={(row) => setSelectedId(row.id)}
            emptyTitle="Aucun utilisateur trouvé"
            emptyText="Ajustez la recherche ou les filtres de rôle et de statut."
            emptyIcon={<Users size={22} />}
            footer={
              <span>
                Registre synchronisé · <strong>{metrics.actifs}</strong> comptes actifs sur{' '}
                <strong>{metrics.total}</strong>
              </span>
            }
            minWidth="860px"
          />
        </div>

        <div className="settings-col">
          <div className="glass-card rights-card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <Fingerprint size={14} />
                  Droits & habilitations
                </div>
                <p className="card-head__subtitle">Attribution rapide des accès dépôt et du niveau de rôle.</p>
              </div>
              {selected && <StatusBadge status={selected.statut} />}
            </div>

            {selected ? (
              <>
                <div className="rights-target">
                  <span className="avatar" style={{ '--tone': toneForName(selected.nom) }}>
                    {initials(selected.nom)}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="rights-target__name">{selected.nom}</div>
                    <div className="rights-target__meta">
                      {selected.role} · {selected.affectation || 'Sans affectation'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-icon is-cyan"
                    title="Ouvrir la fiche complète"
                    aria-label="Ouvrir la fiche complète"
                    onClick={() => setDetail(selected)}
                  >
                    <UserRoundCog size={14} />
                  </button>
                </div>

                <div className="form" style={{ marginTop: 12 }}>
                  <Field label="Rôle opérationnel" htmlFor="rights-role">
                    <select
                      id="rights-role"
                      value={rightsDraft.role}
                      onChange={(event) => setRightsDraft((current) => ({ ...current, role: event.target.value }))}
                    >
                      {ROLES_UTILISATEUR.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </Field>

                  <div className="rights-switches">
                    {HABILITATIONS.map((habilitation) => (
                      <label className="rights-switch" key={habilitation}>
                        <div>
                          <div className="rights-switch__label">{habilitation}</div>
                          <div className="rights-switch__hint">{HABILITATION_HINTS[habilitation]}</div>
                        </div>
                        <span className="switch">
                          <input
                            type="checkbox"
                            checked={rightsDraft.habilitations.includes(habilitation)}
                            onChange={() => toggleRight(habilitation)}
                          />
                          <span className="switch__track" />
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="security-log">
                    <div className="security-log__row">
                      <span className="security-log__dot" />
                      Compte créé le {formatDate(selected.dateEntree)}
                    </div>
                    <div className="security-log__row">
                      <span className="security-log__dot" />
                      {(loansByUser[selected.id]?.actifs.length || 0)} emprunt(s) actif(s) ·{' '}
                      {selected.habilitations?.length || 0} habilitation(s)
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={revokeRights}
                      disabled={!rightsDraft.habilitations.length}
                    >
                      Révoquer
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={saveRights}
                      disabled={!rightsDirty}
                    >
                      <ShieldCheck size={14} />
                      Enregistrer les droits
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Fingerprint size={22} />}
                title="Aucun compte sélectionné"
                text="Choisissez un utilisateur dans le registre pour ajuster ses accès."
                action={
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    <Plus size={14} />
                    Créer un compte
                  </button>
                }
              />
            )}
          </div>

          <div className="glass-card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <ShieldCheck size={14} />
                  Répartition des rôles
                </div>
                <p className="card-head__subtitle">Couverture opérationnelle de l’équipe.</p>
              </div>
            </div>
            <div className="role-list">
              {ROLES_UTILISATEUR.map((role) => (
                <div className="role-row" key={role}>
                  <div>
                    <div className="role-row__name">{role}</div>
                    <div className="role-row__desc">
                      {role === 'Administrateur'
                        ? 'Accès total aux consoles et coffres'
                        : role === 'Régisseur'
                          ? 'Pilotage des équipes et validations'
                          : role === 'Technicien'
                            ? 'Mouvements terrain et retours'
                            : role === 'Magasinier'
                              ? 'Inventaire et maintenance dépôt'
                              : 'Accès encadré aux sorties matériel'}
                    </div>
                  </div>
                  <span className="role-row__count">{roleCounts[role] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.nom || 'Fiche utilisateur'}
        subtitle={detail ? `${detail.role} · ${detail.email}` : undefined}
        icon={<UserRoundCog size={16} />}
        variant="drawer"
        footer={
          detail && (
            <>
              <button type="button" className="btn btn-danger" onClick={() => remove(detail)}>
                <Trash2 size={14} />
                Supprimer
              </button>
              <span className="toolbar__spacer" />
              <button type="button" className="btn btn-secondary" onClick={() => openEdit(detail)}>
                <Pencil size={14} />
                Modifier
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelectedId(detail.id)
                  setDetail(null)
                }}
              >
                <Fingerprint size={14} />
                Gérer les droits
              </button>
            </>
          )
        }
      >
        {detail && (
          <>
            <div className="profile-head">
              <span className="avatar avatar--lg" style={{ '--tone': toneForName(detail.nom) }}>
                {initials(detail.nom)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="profile-head__name">{detail.nom}</div>
                <div className="profile-head__role">
                  <ShieldCheck size={11} />
                  {detail.role} · <StatusBadge status={detail.statut} />
                </div>
                <div className="profile-head__meta">{detail.affectation || 'Aucune affectation en cours'}</div>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">
                  <Mail size={11} /> E-mail
                </div>
                <div className="detail-item__value mono">{detail.email}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">
                  <Phone size={11} /> Téléphone
                </div>
                <div className="detail-item__value mono">{detail.telephone || 'Non renseigné'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">
                  <CalendarDays size={11} /> Entrée dans l’équipe
                </div>
                <div className="detail-item__value">{formatDate(detail.dateEntree)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">
                  <Wrench size={11} /> Emprunts actifs
                </div>
                <div className="detail-item__value">
                  {detailLoans.length} / {loansByUser[detail.id]?.total || 0}
                </div>
              </div>
              <div className="detail-item span-full">
                <div className="detail-item__label">Habilitations dépôt</div>
                <div className="habilitation-list" style={{ marginTop: 5 }}>
                  {(detail.habilitations || []).length ? (
                    detail.habilitations.map((habilitation) => (
                      <span className="chip chip--cyan" key={habilitation}>{habilitation}</span>
                    ))
                  ) : (
                    <span className="muted">Aucune habilitation accordée.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="card-head" style={{ marginTop: 18 }}>
              <div>
                <div className="card-head__title">Engagements en cours</div>
                <p className="card-head__subtitle">Matériel encore sous la responsabilité de {detail.nom}.</p>
              </div>
            </div>

            {detailLoans.length ? (
              <div className="settings-col" style={{ gap: 7 }}>
                {detailLoans.map((emprunt) => (
                  <div className="role-row" key={emprunt.id}>
                    <div>
                      <div className="role-row__name mono">{emprunt.reference}</div>
                      <div className="role-row__desc">
                        {evenementById[emprunt.evenementId]?.nom || 'Sans événement'} · retour prévu le{' '}
                        {formatDate(emprunt.dateRetourPrevue)}
                      </div>
                    </div>
                    <StatusBadge status={emprunt.statut} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<BadgeCheck size={20} />}
                title="Aucun engagement"
                text="Tout le matériel emprunté par cet utilisateur a été restitué."
              />
            )}
          </>
        )}
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier le compte' : 'Nouvel utilisateur'}
        subtitle={editing ? editing.email : 'Créez un accès nominatif au registre du parc.'}
        icon={<UserPlus size={16} />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button type="submit" form="utilisateur-form" className="btn btn-primary">
              <ShieldCheck size={14} />
              {editing ? 'Enregistrer' : 'Créer le compte'}
            </button>
          </>
        }
      >
        <form id="utilisateur-form" className="form" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Nom complet" htmlFor="usr-nom" required error={errors.nom}>
              <input
                id="usr-nom"
                type="text"
                value={draft.nom}
                onChange={(event) => setField('nom', event.target.value)}
                placeholder="Prénom Nom"
                autoFocus
              />
            </Field>
            <Field label="Adresse e-mail" htmlFor="usr-email" required error={errors.email}>
              <input
                id="usr-email"
                type="email"
                value={draft.email}
                onChange={(event) => setField('email', event.target.value)}
                placeholder="prenom.nom@eventmanager.fr"
              />
            </Field>
            <Field label="Téléphone" htmlFor="usr-tel">
              <input
                id="usr-tel"
                type="tel"
                value={draft.telephone}
                onChange={(event) => setField('telephone', event.target.value)}
                placeholder="+33 6 00 00 00 00"
              />
            </Field>
            <Field label="Rôle" htmlFor="usr-role" required error={errors.role}>
              <select
                id="usr-role"
                value={draft.role}
                onChange={(event) => setField('role', event.target.value)}
              >
                {ROLES_UTILISATEUR.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </Field>
            <Field label="Statut" htmlFor="usr-statut">
              <select
                id="usr-statut"
                value={draft.statut}
                onChange={(event) => setField('statut', event.target.value)}
              >
                {STATUTS_UTILISATEUR.map((statut) => (
                  <option key={statut} value={statut}>{statut}</option>
                ))}
              </select>
            </Field>
            <Field label="Date d’entrée" htmlFor="usr-date" required error={errors.dateEntree}>
              <input
                id="usr-date"
                type="date"
                value={draft.dateEntree}
                onChange={(event) => setField('dateEntree', event.target.value)}
              />
            </Field>
            <Field
              label="Affectation actuelle"
              htmlFor="usr-affectation"
              className="span-full"
              hint="Site, tournée ou pôle opérationnel auquel le compte est rattaché."
            >
              <input
                id="usr-affectation"
                type="text"
                value={draft.affectation}
                onChange={(event) => setField('affectation', event.target.value)}
                placeholder="Ex. Régie son — Nuits Sonores"
              />
            </Field>
          </div>

          <div className="form-section">
            <div className="form-section__head">
              <span className="form-section__num">02</span>
              <div>
                <div className="form-section__title">Habilitations dépôt</div>
                <div className="form-section__hint">Sélectionnez les opérations autorisées pour ce compte.</div>
              </div>
            </div>
            <div className="checkbox-grid">
              {HABILITATIONS.map((habilitation) => {
                const checked = draft.habilitations.includes(habilitation)
                return (
                  <label className={`checkbox-row ${checked ? 'is-checked' : ''}`.trim()} key={habilitation}>
                    <input type="checkbox" checked={checked} onChange={() => toggleHabilitation(habilitation)} />
                    <span>
                      <span style={{ display: 'block', color: 'var(--text)', fontWeight: 600 }}>{habilitation}</span>
                      <span className="cell-sub">{HABILITATION_HINTS[habilitation]}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Utilisateurs
