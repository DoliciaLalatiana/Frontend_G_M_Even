import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  Building2,
  CloudDownload,
  Copy,
  Database,
  Eye,
  EyeOff,
  Fingerprint,
  Globe2,
  History,
  KeyRound,
  MapPin,
  Palette,
  Plus,
  RadioTower,
  RefreshCw,
  RotateCcw,
  Save,
  ScanLine,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  Trash2,
  Warehouse,
} from 'lucide-react'
import Field from '../components/common/Field'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import { useConfirm } from '../context/ConfirmContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { parametresInitiaux } from '../data/parametres'
import { APP_VERSION } from '../utils/constants'
import { initials, todayISO } from '../utils/format'

const SETTINGS_TABS = [
  { id: 'general', label: 'Général & Dépôt', icon: Warehouse },
  { id: 'profile', label: 'Profil Régisseur & Sécurité', icon: BadgeCheck },
  { id: 'stock', label: 'Règles de Stock & Alertes SAV', icon: SlidersHorizontal },
  { id: 'rfid', label: 'Scanners RFID & IoT Dépôt', icon: RadioTower },
  { id: 'api', label: 'Intégrations & Sauvegardes', icon: KeyRound },
]

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (EUR — France)' },
  { value: 'USD', label: 'Dollar américain (USD)' },
  { value: 'GBP', label: 'Livre sterling (GBP)' },
  { value: 'CHF', label: 'Franc suisse (CHF)' },
]

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+02:00 CET)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+01:00 GMT)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-04:00 EDT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+09:00 JST)' },
]

const LANGUAGES = [
  { value: 'Français (France)', label: 'Français (Standard AFNOR / Dépôt)' },
  { value: 'English (UK)', label: 'English (Live Touring Edition)' },
]

const THEMES = [
  { value: 'dark', label: 'Dark Ice Glass' },
  { value: 'light', label: 'Clair opérationnel' },
  { value: 'system', label: 'Système' },
]

const DENSITIES = [
  { value: 'confort', label: 'Confort' },
  { value: 'compact', label: 'Compacte' },
]

const INITIAL_AUDIT = [
  {
    id: 'audit-01',
    action: 'Ajustement du seuil critique de flotte',
    detail: 'Seuil critique porté à 85 % — validation direction requise.',
    user: 'Alexandre Mercier',
    date: '2026-10-30T08:12:00',
  },
  {
    id: 'audit-02',
    action: 'Rotation de la clé API de production',
    detail: 'Nouvelle clé générée pour les intégrations REST & GraphQL.',
    user: 'Système',
    date: '2026-10-29T02:00:00',
  },
  {
    id: 'audit-03',
    action: 'Sauvegarde froide certifiée',
    detail: 'Instantané de 184 Mo vérifié SHA-256 et répliqué.',
    user: 'Système',
    date: '2026-10-28T04:00:00',
  },
  {
    id: 'audit-04',
    action: 'Mise à jour du protocole de relance',
    detail: 'Relance SMS et e-mail automatique activée pour les retards.',
    user: 'Alexandre Mercier',
    date: '2026-10-24T16:35:00',
  },
]

const hydrateSettings = (source = {}) => ({
  ...parametresInitiaux,
  ...source,
  organisation: { ...parametresInitiaux.organisation, ...(source.organisation || {}) },
  profil: { ...parametresInitiaux.profil, ...(source.profil || {}) },
  stock: { ...parametresInitiaux.stock, ...(source.stock || {}) },
  rfid: { ...parametresInitiaux.rfid, ...(source.rfid || {}) },
  api: { ...parametresInitiaux.api, ...(source.api || {}) },
  preferences: { ...parametresInitiaux.preferences, ...(source.preferences || {}) },
  emplacements: Array.isArray(source.emplacements)
    ? source.emplacements
    : parametresInitiaux.emplacements,
})

const formatAuditDate = (value) =>
  new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const nowLabel = () =>
  new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const downloadFile = (content, filename, mimeType = 'application/json') => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const generateApiKey = () => {
  const alphabet = '0123456789abcdef'
  const body = Array.from({ length: 32 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return `em_live_${body}`
}

const Parametres = () => {
  const {
    materiels,
    categories,
    evenements,
    emprunts,
    retours,
    reservations,
    utilisateurs,
    rapports,
    parametres,
    updateParametres,
    resetDonnees,
  } = useData()
  const { pushToast } = useToast()
  const confirm = useConfirm()

  const [activeTab, setActiveTab] = useState('general')
  const [draft, setDraft] = useState(() => hydrateSettings(parametres))
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditLog, setAuditLog] = useState(INITIAL_AUDIT)
  const [newEmplacement, setNewEmplacement] = useState('')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    setDraft(hydrateSettings(parametres))
  }, [parametres])

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(hydrateSettings(parametres)),
    [draft, parametres],
  )

  const setField = (section, key, value) => {
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }))
  }

  const registerAudit = (action, detail) => {
    const entry = {
      id: `audit-${Date.now()}`,
      action,
      detail,
      user: draft.profil.nom || 'Administrateur',
      date: new Date().toISOString(),
    }
    setAuditLog((current) => [entry, ...current].slice(0, 16))
  }

  const saveSettings = async () => {
    await Promise.all(
      Object.entries(draft)
        .filter(([section]) => section !== '__ids')
        .map(([section, values]) => updateParametres(section, values)),
    )
    registerAudit(
      'Enregistrement des paramètres système',
      `Configuration ${draft.organisation.nom} mise à jour depuis l'onglet « ${
        SETTINGS_TABS.find((tab) => tab.id === activeTab)?.label || 'Général'
      } ».`,
    )
    pushToast({
      title: 'Modifications enregistrées',
      message: `L'instance ${draft.organisation.nom} a mis à jour les règles du parc.`,
    })
  }

  const addEmplacement = () => {
    const value = newEmplacement.trim()
    if (!value) return
    if ((draft.emplacements || []).some((item) => item.toLowerCase() === value.toLowerCase())) {
      pushToast({ title: 'Emplacement déjà présent', message: 'Choisissez un libellé différent.', type: 'warning' })
      return
    }
    setDraft((current) => ({ ...current, emplacements: [...(current.emplacements || []), value] }))
    setNewEmplacement('')
  }

  const removeEmplacement = (value) => {
    setDraft((current) => ({
      ...current,
      emplacements: (current.emplacements || []).filter((item) => item !== value),
    }))
  }

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(draft.api.cle)
      pushToast('Clé API copiée dans le presse-papiers')
    } catch {
      pushToast({
        title: 'Copie impossible',
        message: 'Le presse-papiers est indisponible dans ce navigateur.',
        type: 'danger',
      })
    }
  }

  const regenerateApiKey = () => {
    setField('api', 'cle', generateApiKey())
    setShowKey(true)
    pushToast({
      title: 'Nouvelle clé générée',
      message: 'Enregistrez les modifications pour appliquer la rotation.',
      type: 'warning',
    })
  }

  const downloadBackup = () => {
    const payload = {
      application: 'EVENT MANAGER',
      version: APP_VERSION,
      generatedAt: new Date().toISOString(),
      parametres: draft,
      data: {
        materiels,
        categories,
        evenements,
        emprunts,
        retours,
        reservations,
        utilisateurs,
        rapports,
      },
    }
    downloadFile(
      JSON.stringify(payload, null, 2),
      `eventmanager-sauvegarde-${todayISO()}.json`,
    )
    const stamp = nowLabel()
    setField('api', 'derniereSauvegarde', stamp)
    registerAudit('Sauvegarde manuelle téléchargée', `Export complet généré le ${stamp}.`)
    pushToast({
      title: 'Sauvegarde générée',
      message: 'Le fichier JSON complet a été téléchargé.',
    })
  }

  const resetSettings = async () => {
    const confirmed = await confirm({
      title: 'Réinitialiser les paramètres ?',
      message: 'Toutes les préférences, seuils et intégrations reviendront aux valeurs de démonstration.',
      confirmLabel: 'Réinitialiser',
      tone: 'warning',
    })
    if (!confirmed) return
    await Promise.all(
      Object.entries(parametresInitiaux).map(([section, values]) => updateParametres(section, values)),
    )
    setDraft(hydrateSettings(parametresInitiaux))
    registerAudit('Réinitialisation des paramètres', 'Configuration système restaurée aux valeurs d’usine.')
    pushToast('Paramètres réinitialisés')
  }

  const resetAllData = async () => {
    const confirmed = await confirm({
      title: 'Réinitialiser toutes les données ?',
      message:
        'Les données affichées seront rechargées depuis le serveur. Cette action ne supprime pas les données de la base.',
      confirmLabel: 'Recharger',
      tone: 'warning',
    })
    if (!confirmed) return
    await resetDonnees()
    setDraft(hydrateSettings(parametresInitiaux))
    registerAudit('Rechargement des données', 'Les données ont été rechargées depuis le serveur.')
    pushToast({
      title: 'Données rechargées',
      message: 'Les informations proviennent maintenant du serveur.',
      type: 'warning',
    })
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Paramètres Généraux"
        icon={<Settings2 size={12} />}
        title="Paramètres du Système & Gestion du Parc"
        subtitle="Configuration de l'instance d'inventaire, seuils d'alertes automatiques, sécurité d'accès matériel et intégrations logistiques."
        meta={dirty ? <span className="badge badge--warning">Modifications non enregistrées</span> : null}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAuditOpen(true)}>
              <History size={14} />
              Journal d'audit
            </button>
            <button type="button" className="btn btn-primary" onClick={saveSettings} disabled={!dirty}>
              <Save size={14} />
              Enregistrer les modifications
            </button>
          </>
        }
      />

      <div className="settings-tabs">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              className={`settings-tab ${activeTab === tab.id ? 'is-active' : ''}`.trim()}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'general' && (
        <div className="settings-layout">
          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <Building2 size={14} />
                    Identité de l'organisation
                  </div>
                  <p className="card-head__subtitle">Coordonnées contractuelles et paramètres régionaux.</p>
                </div>
                <span className="badge badge--cyan">{draft.organisation.devise}</span>
              </div>

              <div className="form-grid">
                <Field label="Nom de l'instance" htmlFor="set-nom">
                  <input
                    id="set-nom"
                    value={draft.organisation.nom}
                    onChange={(event) => setField('organisation', 'nom', event.target.value)}
                  />
                </Field>
                <Field label="Raison sociale" htmlFor="set-raison">
                  <input
                    id="set-raison"
                    value={draft.organisation.raisonSociale}
                    onChange={(event) => setField('organisation', 'raisonSociale', event.target.value)}
                  />
                </Field>
                <Field label="Email de contact" htmlFor="set-email">
                  <input
                    id="set-email"
                    type="email"
                    value={draft.organisation.email}
                    onChange={(event) => setField('organisation', 'email', event.target.value)}
                  />
                </Field>
                <Field label="Téléphone" htmlFor="set-telephone">
                  <input
                    id="set-telephone"
                    value={draft.organisation.telephone}
                    onChange={(event) => setField('organisation', 'telephone', event.target.value)}
                  />
                </Field>
                <Field label="Adresse du dépôt" htmlFor="set-adresse" className="span-full">
                  <input
                    id="set-adresse"
                    value={draft.organisation.adresse}
                    onChange={(event) => setField('organisation', 'adresse', event.target.value)}
                  />
                </Field>
                <Field label="SIRET" htmlFor="set-siret">
                  <input
                    id="set-siret"
                    value={draft.organisation.siret}
                    onChange={(event) => setField('organisation', 'siret', event.target.value)}
                  />
                </Field>
                <Field label="Site web" htmlFor="set-site">
                  <input
                    id="set-site"
                    value={draft.organisation.siteWeb}
                    onChange={(event) => setField('organisation', 'siteWeb', event.target.value)}
                  />
                </Field>
                <Field label="Devise comptable" htmlFor="set-devise">
                  <select
                    id="set-devise"
                    value={draft.organisation.devise}
                    onChange={(event) => setField('organisation', 'devise', event.target.value)}
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fuseau horaire" htmlFor="set-fuseau">
                  <select
                    id="set-fuseau"
                    value={draft.organisation.fuseau}
                    onChange={(event) => setField('organisation', 'fuseau', event.target.value)}
                  >
                    {TIMEZONES.map((timezone) => (
                      <option key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Langue du système" htmlFor="set-langue" className="span-full">
                  <select
                    id="set-langue"
                    value={draft.organisation.langue}
                    onChange={(event) => setField('organisation', 'langue', event.target.value)}
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language.value} value={language.value}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <Palette size={14} />
                    Préférences d'interface
                  </div>
                  <p className="card-head__subtitle">Confort de lecture et densité des consoles.</p>
                </div>
              </div>
              <div className="form-grid">
                <Field label="Thème" htmlFor="set-theme">
                  <select
                    id="set-theme"
                    value={draft.preferences.theme}
                    onChange={(event) => setField('preferences', 'theme', event.target.value)}
                  >
                    {THEMES.map((theme) => (
                      <option key={theme.value} value={theme.value}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Densité d'affichage" htmlFor="set-densite">
                  <select
                    id="set-densite"
                    value={draft.preferences.densite}
                    onChange={(event) => setField('preferences', 'densite', event.target.value)}
                  >
                    {DENSITIES.map((density) => (
                      <option key={density.value} value={density.value}>
                        {density.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <label className="switch-row" htmlFor="set-animations">
                <div>
                  <div className="switch-row__label">Animations et transitions</div>
                  <div className="switch-row__hint">Conserve les effets de profondeur et les micro-interactions.</div>
                </div>
                <span className="switch">
                  <input
                    id="set-animations"
                    type="checkbox"
                    checked={draft.preferences.animations}
                    onChange={(event) => setField('preferences', 'animations', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>
              <label className="switch-row" htmlFor="set-raccourcis">
                <div>
                  <div className="switch-row__label">Raccourcis clavier</div>
                  <div className="switch-row__hint">Active la recherche rapide et la navigation au clavier.</div>
                </div>
                <span className="switch">
                  <input
                    id="set-raccourcis"
                    type="checkbox"
                    checked={draft.preferences.raccourcis}
                    onChange={(event) => setField('preferences', 'raccourcis', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>
            </section>
          </div>

          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <MapPin size={14} />
                    Emplacements logistiques
                  </div>
                  <p className="card-head__subtitle">
                    Zones de stockage et baies rattachées au hub principal.
                  </p>
                </div>
                <span className="badge badge--violet">{(draft.emplacements || []).length} zones</span>
              </div>

              <div className="form">
                <div className="api-key-row">
                  <input
                    value={newEmplacement}
                    onChange={(event) => setNewEmplacement(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addEmplacement()
                      }
                    }}
                    placeholder="Nouvel emplacement (ex. Quai C — régie)"
                    aria-label="Nouvel emplacement"
                  />
                  <button type="button" className="btn btn-secondary" onClick={addEmplacement}>
                    <Plus size={14} />
                    Ajouter
                  </button>
                </div>

                <div className="location-list">
                  {(draft.emplacements || []).map((emplacement) => (
                    <div className="location-row" key={emplacement}>
                      <MapPin size={12} />
                      <span>{emplacement}</span>
                      <button
                        type="button"
                        className="location-row__remove"
                        onClick={() => removeEmplacement(emplacement)}
                        aria-label={`Supprimer ${emplacement}`}
                        title="Supprimer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <Globe2 size={14} />
                    Instance & normalisation
                  </div>
                  <p className="card-head__subtitle">Rattachement du hub et format d'horodatage.</p>
                </div>
                <span className="badge badge--cyan">PROD-FR01</span>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item__label">Hub opérationnel</div>
                  <div className="detail-item__value">Parc Opérationnel Central</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Langue</div>
                  <div className="detail-item__value">{draft.organisation.langue}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Fuseau</div>
                  <div className="detail-item__value mono">{draft.organisation.fuseau}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Horodatage</div>
                  <div className="detail-item__value mono">JJ/MM/AAAA · HH:mm:ss</div>
                </div>
                <div className="detail-item span-full">
                  <div className="detail-item__label">Dépôt principal</div>
                  <div className="detail-item__value">{draft.organisation.adresse}</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="settings-layout">
          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <BadgeCheck size={14} />
                    Profil régisseur
                  </div>
                  <p className="card-head__subtitle">Identité active et coordonnées d'astreinte.</p>
                </div>
                <StatusBadge status="Actif" />
              </div>

              <div className="profile-head">
                <span className="avatar avatar--lg">{initials(draft.profil.nom)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="profile-head__name">{draft.profil.nom}</div>
                  <div className="profile-head__role">
                    <ShieldCheck size={11} />
                    {draft.profil.role}
                  </div>
                  <div className="profile-head__meta">{draft.profil.email}</div>
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <Field label="Nom complet" htmlFor="set-profil-nom">
                  <input
                    id="set-profil-nom"
                    value={draft.profil.nom}
                    onChange={(event) => setField('profil', 'nom', event.target.value)}
                  />
                </Field>
                <Field label="Titre / fonction" htmlFor="set-profil-role">
                  <input
                    id="set-profil-role"
                    value={draft.profil.role}
                    onChange={(event) => setField('profil', 'role', event.target.value)}
                  />
                </Field>
                <Field label="Email institutionnel" htmlFor="set-profil-email">
                  <input
                    id="set-profil-email"
                    type="email"
                    value={draft.profil.email}
                    onChange={(event) => setField('profil', 'email', event.target.value)}
                  />
                </Field>
                <Field label="Téléphone d'astreinte 24/7" htmlFor="set-profil-telephone">
                  <input
                    id="set-profil-telephone"
                    value={draft.profil.telephone}
                    onChange={(event) => setField('profil', 'telephone', event.target.value)}
                  />
                </Field>
              </div>

              <label className="switch-row" htmlFor="set-signature" style={{ marginTop: 8 }}>
                <div>
                  <div className="switch-row__label">
                    <Fingerprint size={12} /> Signature numérique des bons de décharge
                  </div>
                  <div className="switch-row__hint">
                    Exige l'approbation biométrique ou une clé cryptographique lors des chargements.
                  </div>
                </div>
                <span className="switch">
                  <input
                    id="set-signature"
                    type="checkbox"
                    checked={draft.profil.signature}
                    onChange={(event) => setField('profil', 'signature', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>
            </section>

            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <BellRing size={14} />
                    Notifications opérationnelles
                  </div>
                  <p className="card-head__subtitle">Alertes de mouvements et escalades critiques.</p>
                </div>
              </div>

              <label className="switch-row" htmlFor="set-notif-email">
                <div>
                  <div className="switch-row__label">Notifications par e-mail</div>
                  <div className="switch-row__hint">Rapports quotidiens, alertes de retard et validations.</div>
                </div>
                <span className="switch">
                  <input
                    id="set-notif-email"
                    type="checkbox"
                    checked={draft.profil.notificationsEmail}
                    onChange={(event) => setField('profil', 'notificationsEmail', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>
              <label className="switch-row" htmlFor="set-notif-push">
                <div>
                  <div className="switch-row__label">Notifications push</div>
                  <div className="switch-row__hint">Escalade immédiate sur mobile pour les incidents SAV.</div>
                </div>
                <span className="switch">
                  <input
                    id="set-notif-push"
                    type="checkbox"
                    checked={draft.profil.notificationsPush}
                    onChange={(event) => setField('profil', 'notificationsPush', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>
            </section>
          </div>

          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <ShieldCheck size={14} />
                    Session & autorité
                  </div>
                  <p className="card-head__subtitle">Portée des droits accordés au profil actif.</p>
                </div>
                <span className="badge badge--success">Session active</span>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item__label">Rôle</div>
                  <div className="detail-item__value">{draft.profil.role}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Niveau d'accès</div>
                  <div className="detail-item__value">Super-administrateur</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Identifiant</div>
                  <div className="detail-item__value mono">REG-8821</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Badge NFC</div>
                  <div className="detail-item__value mono">#NFC-994-01-A</div>
                </div>
                <div className="detail-item span-full">
                  <div className="detail-item__label">Signature numérique</div>
                  <div className="detail-item__value">
                    {draft.profil.signature ? 'Obligatoire sur les bons de décharge' : 'Optionnelle'}
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <TimerReset size={14} />
                    Journal de connexion
                  </div>
                  <p className="card-head__subtitle">Dernières activités du profil régisseur.</p>
                </div>
              </div>
              <div className="security-log">
                <div className="security-log__row">
                  <span className="security-log__dot" />
                  Dernière connexion aujourd'hui à 14:12 — Paris
                </div>
                <div className="security-log__row">
                  <span className="security-log__dot" />
                  Signature de 12 bons de sortie cette semaine
                </div>
                <div className="security-log__row">
                  <span className="security-log__dot" />
                  Aucune alerte de sécurité sur les 30 derniers jours
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="settings-layout">
          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <AlertTriangle size={14} />
                    Seuils d'alerte de flotte
                  </div>
                  <p className="card-head__subtitle">Déclenchement des alertes et blocages de réservation.</p>
                </div>
                <span className="badge badge--warning">Règles strictes</span>
              </div>

              <div className="settings-section">
                <div className="threshold-display">
                  <span>Seuil critique d'engagement global</span>
                  <strong>{draft.stock.seuilCritique} %</strong>
                </div>
                <div className="progress progress--lg">
                  <div
                    className="progress__bar"
                    style={{
                      width: `${Math.min(100, Math.max(0, Number(draft.stock.seuilCritique) || 0))}%`,
                      '--tone': 'var(--danger)',
                    }}
                  />
                </div>
                <input
                  className="range"
                  type="range"
                  min="0"
                  max="100"
                  value={draft.stock.seuilCritique}
                  onChange={(event) => setField('stock', 'seuilCritique', Number(event.target.value))}
                  aria-label="Seuil critique"
                />
                <div className="threshold-display">
                  <span>0 % — réserve totale</span>
                  <span className="muted">100 % — saturation</span>
                </div>
              </div>

              <div className="settings-section">
                <div className="threshold-display">
                  <span>Seuil d'alerte anticipée</span>
                  <strong>{draft.stock.seuilAlerte} %</strong>
                </div>
                <div className="progress progress--lg">
                  <div
                    className="progress__bar"
                    style={{
                      width: `${Math.min(100, Math.max(0, Number(draft.stock.seuilAlerte) || 0))}%`,
                      '--tone': 'var(--warning)',
                    }}
                  />
                </div>
                <input
                  className="range"
                  type="range"
                  min="0"
                  max="100"
                  value={draft.stock.seuilAlerte}
                  onChange={(event) => setField('stock', 'seuilAlerte', Number(event.target.value))}
                  aria-label="Seuil d'alerte"
                />
              </div>

              <div className="settings-section">
                <div className="threshold-display">
                  <span>Délai de grâce avant alerte de retard</span>
                  <strong>{draft.stock.delaiGrace} h</strong>
                </div>
                <input
                  className="range"
                  type="range"
                  min="1"
                  max="72"
                  value={draft.stock.delaiGrace}
                  onChange={(event) => setField('stock', 'delaiGrace', Number(event.target.value))}
                  aria-label="Délai de grâce"
                />
                <p className="settings-section__hint">
                  Tolérance accordée aux équipes de démontage avant escalade SAV.
                </p>
              </div>
            </section>
          </div>

          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <SlidersHorizontal size={14} />
                    Automatisation & garde-fous
                  </div>
                  <p className="card-head__subtitle">Règles appliquées à chaque mouvement de matériel.</p>
                </div>
              </div>

              <label className="switch-row" htmlFor="set-litige">
                <div>
                  <div className="switch-row__label">Blocage automatique en cas de litige SAV</div>
                  <div className="switch-row__hint">
                    Interdit tout emprunt à un technicien ou prestataire ayant un dossier dommage ouvert.
                  </div>
                </div>
                <span className="switch">
                  <input
                    id="set-litige"
                    type="checkbox"
                    checked={draft.stock.blocageLitige}
                    onChange={(event) => setField('stock', 'blocageLitige', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>

              <label className="switch-row" htmlFor="set-relance">
                <div>
                  <div className="switch-row__label">Relance automatisée des retards</div>
                  <div className="switch-row__hint">
                    Envoi immédiat d'un SMS au chef de plateau et d'un e-mail de suivi géolocalisé.
                  </div>
                </div>
                <span className="switch">
                  <input
                    id="set-relance"
                    type="checkbox"
                    checked={draft.stock.relanceAuto}
                    onChange={(event) => setField('stock', 'relanceAuto', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>

              <label className="switch-row" htmlFor="set-caution">
                <div>
                  <div className="switch-row__label">Caution obligatoire</div>
                  <div className="switch-row__hint">
                    Exige une empreinte de caution avant la validation d'un départ matériel.
                  </div>
                </div>
                <span className="switch">
                  <input
                    id="set-caution"
                    type="checkbox"
                    checked={draft.stock.cautionObligatoire}
                    onChange={(event) => setField('stock', 'cautionObligatoire', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>
            </section>

            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <TimerReset size={14} />
                    Politique de retard
                  </div>
                  <p className="card-head__subtitle">Synthèse des règles actives sur le parc.</p>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item__label">Seuil critique</div>
                  <div className="detail-item__value">{draft.stock.seuilCritique} %</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Seuil d'alerte</div>
                  <div className="detail-item__value">{draft.stock.seuilAlerte} %</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Délai de grâce</div>
                  <div className="detail-item__value">{draft.stock.delaiGrace} heures</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Relance automatique</div>
                  <div className="detail-item__value">{draft.stock.relanceAuto ? 'Activée' : 'Désactivée'}</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'rfid' && (
        <div className="settings-layout">
          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <ScanLine size={14} />
                    Configuration de la borne RFID
                  </div>
                  <p className="card-head__subtitle">Lecteur principal et portée de détection du dépôt.</p>
                </div>
                <span className={`badge badge--${draft.rfid.actif ? 'success' : 'neutral'}`}>
                  {draft.rfid.actif ? 'Active' : 'Désactivée'}
                </span>
              </div>

              <label className="switch-row" htmlFor="set-rfid-actif">
                <div>
                  <div className="switch-row__label">Lecture RFID temps réel</div>
                  <div className="switch-row__hint">Synchronise les entrées et sorties avec le stock central.</div>
                </div>
                <span className="switch">
                  <input
                    id="set-rfid-actif"
                    type="checkbox"
                    checked={draft.rfid.actif}
                    onChange={(event) => setField('rfid', 'actif', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>

              <div className="form-grid" style={{ marginTop: 10 }}>
                <Field label="Borne / point de lecture" htmlFor="set-rfid-borne" className="span-full">
                  <input
                    id="set-rfid-borne"
                    value={draft.rfid.borne}
                    onChange={(event) => setField('rfid', 'borne', event.target.value)}
                  />
                </Field>
                <Field label="Portée de détection" htmlFor="set-rfid-portee">
                  <input
                    id="set-rfid-portee"
                    value={draft.rfid.portee}
                    onChange={(event) => setField('rfid', 'portee', event.target.value)}
                  />
                </Field>
                <Field label="Intervalle de scan (secondes)" htmlFor="set-rfid-intervalle">
                  <input
                    id="set-rfid-intervalle"
                    type="number"
                    min="5"
                    max="300"
                    value={draft.rfid.intervalle}
                    onChange={(event) => setField('rfid', 'intervalle', Number(event.target.value))}
                  />
                </Field>
              </div>
            </section>
          </div>

          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <RadioTower size={14} />
                    Télémétrie de la borne
                  </div>
                  <p className="card-head__subtitle">État de la liaison et dernière synchronisation.</p>
                </div>
                <span className="badge badge--cyan">SYNC 12 ms</span>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item__label">Point de lecture</div>
                  <div className="detail-item__value">{draft.rfid.borne}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Portée</div>
                  <div className="detail-item__value mono">{draft.rfid.portee}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">Intervalle</div>
                  <div className="detail-item__value">{draft.rfid.intervalle} secondes</div>
                </div>
                <div className="detail-item">
                  <div className="detail-item__label">État</div>
                  <div className="detail-item__value">{draft.rfid.actif ? 'En ligne' : 'Hors ligne'}</div>
                </div>
                <div className="detail-item span-full">
                  <div className="detail-item__label">Couverture opérationnelle</div>
                  <div className="detail-item__value">Dépôt central, quais A/B/C et zone de levage.</div>
                </div>
              </div>

              <div className="security-log" style={{ marginTop: 12 }}>
                <div className="security-log__row">
                  <span className="security-log__dot" />
                  Dernière lecture : palette SON-042 à 14:08
                </div>
                <div className="security-log__row">
                  <span className="security-log__dot" />
                  248 badges actifs détectés cette semaine
                </div>
                <div className="security-log__row">
                  <span className="security-log__dot" />
                  Aucune collision de lecture signalée
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="settings-layout">
          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <KeyRound size={14} />
                    Clé d'accès API
                  </div>
                  <p className="card-head__subtitle">Sécurité cryptographique des intégrations REST & GraphQL.</p>
                </div>
                <span className="badge badge--cyan">TLS 1.3</span>
              </div>

              <div className="form">
                <Field label="URL de l'API de production" htmlFor="set-api-url">
                  <input
                    id="set-api-url"
                    value={draft.api.url}
                    onChange={(event) => setField('api', 'url', event.target.value)}
                  />
                </Field>

                <Field label="Clé API de production" htmlFor="set-api-key">
                  <div className="api-key-row">
                    <input
                      id="set-api-key"
                      type={showKey ? 'text' : 'password'}
                      value={draft.api.cle}
                      readOnly
                    />
                    <button
                      type="button"
                      className="btn-icon is-cyan"
                      onClick={() => setShowKey((current) => !current)}
                      title={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                      aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={copyApiKey}
                    >
                      <Copy size={14} />
                      Copier
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={regenerateApiKey}>
                      <RefreshCw size={14} />
                      Régénérer
                    </button>
                  </div>
                </Field>

                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-item__label">Expiration</div>
                    <div className="detail-item__value">Dans 89 jours</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-item__label">Portée</div>
                    <div className="detail-item__value">Production · lecture/écriture</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <Database size={14} />
                    Sauvegardes & réplication
                  </div>
                  <p className="card-head__subtitle">Instantanés certifiés et copie froide de secours.</p>
                </div>
                <span className="badge badge--success">SHA-256</span>
              </div>

              <label className="switch-row" htmlFor="set-backup-auto">
                <div>
                  <div className="switch-row__label">Sauvegarde automatique quotidienne</div>
                  <div className="switch-row__hint">Instantané à froid répliqué chaque nuit à 02:00.</div>
                </div>
                <span className="switch">
                  <input
                    id="set-backup-auto"
                    type="checkbox"
                    checked={draft.api.sauvegardeAuto}
                    onChange={(event) => setField('api', 'sauvegardeAuto', event.target.checked)}
                  />
                  <span className="switch__track" />
                </span>
              </label>

              <div className="backup-box">
                <div>
                  <div className="backup-box__title">Dernier instantané certifié</div>
                  <div className="backup-box__meta">
                    {draft.api.derniereSauvegarde} · {materiels.length} matériels · 184 Mo
                  </div>
                </div>
                <button type="button" className="btn btn-secondary" onClick={downloadBackup}>
                  <CloudDownload size={14} />
                  Télécharger la sauvegarde
                </button>
              </div>
            </section>
          </div>

          <div className="settings-col">
            <section className="glass-card">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <Globe2 size={14} />
                    État des intégrations
                  </div>
                  <p className="card-head__subtitle">Services connectés à l'instance de production.</p>
                </div>
              </div>

              <div className="role-list">
                <div className="role-row">
                  <div>
                    <div className="role-row__name">REST & GraphQL API</div>
                    <div className="role-row__desc">{draft.api.url}</div>
                  </div>
                  <span className="badge badge--success">Connecté</span>
                </div>
                <div className="role-row">
                  <div>
                    <div className="role-row__name">Sauvegarde froide</div>
                    <div className="role-row__desc">
                      {draft.api.sauvegardeAuto ? 'Planifiée chaque nuit à 02:00' : 'Automatisation désactivée'}
                    </div>
                  </div>
                  <span className={`badge badge--${draft.api.sauvegardeAuto ? 'cyan' : 'neutral'}`}>
                    {draft.api.sauvegardeAuto ? 'Active' : 'Manuelle'}
                  </span>
                </div>
                <div className="role-row">
                  <div>
                    <div className="role-row__name">Webhooks ERP</div>
                    <div className="role-row__desc">Synchronisation des bons de commande et factures.</div>
                  </div>
                  <span className="badge badge--success">3 actifs</span>
                </div>
              </div>
            </section>

            <section className="glass-card danger-zone">
              <div className="card-head">
                <div>
                  <div className="card-head__title">
                    <AlertTriangle size={14} />
                    Zone sensible
                  </div>
                  <p className="card-head__subtitle">Actions irréversibles sur la configuration et les données.</p>
                </div>
              </div>

              <div className="settings-col" style={{ gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-block" onClick={resetSettings}>
                  <RotateCcw size={14} />
                  Réinitialiser les paramètres
                </button>
                <button type="button" className="btn btn-danger btn-block" onClick={resetAllData}>
                  <Trash2 size={14} />
                  Réinitialiser toutes les données
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      <Modal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        title="Journal d'audit système"
        subtitle="Historique des modifications de configuration et des opérations sensibles."
        icon={<History size={16} />}
        size="lg"
      >
        <div className="settings-col" style={{ gap: 8 }}>
          {auditLog.map((entry) => (
            <div className="role-row" key={entry.id}>
              <div style={{ minWidth: 0 }}>
                <div className="role-row__name">{entry.action}</div>
                <div className="role-row__desc">{entry.detail}</div>
                <div className="role-row__desc">
                  {entry.user} · {formatAuditDate(entry.date)}
                </div>
              </div>
              <span className="badge badge--cyan">Audit</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export default Parametres
