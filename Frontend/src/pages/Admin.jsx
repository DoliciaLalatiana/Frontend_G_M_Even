import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Database,
  FileText,
  KeyRound,
  Package,
  RadioTower,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react'
import EmptyState from '../components/common/EmptyState'
import PageHeader from '../components/common/PageHeader'
import StatCard from '../components/common/StatCard'
import StatusBadge from '../components/common/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import {
  getEmpruntsEnRetard,
  getMaterielsEndommages,
  getMaterielsEnMaintenance,
  getStockFaible,
} from '../services/stockService'
import { ROLES_UTILISATEUR } from '../utils/constants'
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from '../utils/format'

const Admin = () => {
  const { user, session } = useAuth()
  const {
    materiels,
    emprunts,
    retours,
    reservations,
    utilisateurs,
    rapports,
    parametres,
  } = useData()

  const activeUsers = utilisateurs.filter((item) => item.statut === 'Actif')
  const admins = utilisateurs.filter((item) => item.role === 'Administrateur')
  const suspendedUsers = utilisateurs.filter((item) => item.statut === 'Suspendu')
  const retards = getEmpruntsEnRetard(emprunts)
  const stockFaible = getStockFaible(materiels, parametres.stock.seuilAlerte)
  const endommages = getMaterielsEndommages(materiels)
  const maintenance = getMaterielsEnMaintenance(materiels)
  const actifs = emprunts.filter((emprunt) => emprunt.statut !== 'Retourné')

  const quantiteTotale = materiels.reduce(
    (total, materiel) => total + Number(materiel.quantiteTotale || 0),
    0,
  )
  const quantiteDisponible = materiels.reduce(
    (total, materiel) => total + Number(materiel.quantiteDisponible || 0),
    0,
  )
  const tauxDisponibilite = quantiteTotale
    ? Math.round((quantiteDisponible / quantiteTotale) * 100)
    : 0

  const roleCounts = useMemo(
    () =>
      ROLES_UTILISATEUR.reduce((counts, role) => {
        counts[role] = utilisateurs.filter((item) => item.role === role).length
        return counts
      }, {}),
    [utilisateurs],
  )

  const activity = useMemo(() => {
    const items = [
      ...rapports.slice(0, 4).map((rapport) => ({
        id: `rap-${rapport.id}`,
        title: rapport.titre,
        meta: `${rapport.type} · ${rapport.auteur}`,
        date: rapport.date,
        to: '/rapports',
        icon: FileText,
        tone: 'is-violet',
      })),
      ...emprunts.slice(0, 4).map((emprunt) => ({
        id: `emp-${emprunt.id}`,
        title: `Mouvement ${emprunt.reference}`,
        meta: `${emprunt.lignes?.length || 0} ligne(s) · ${emprunt.statut}`,
        date: emprunt.dateEmprunt,
        to: '/emprunts',
        icon: ArrowUpRight,
        tone: '',
      })),
      ...retours.slice(0, 4).map((retour) => ({
        id: `ret-${retour.id}`,
        title: `Retour ${retour.reference || retour.empruntId}`,
        meta: `${retour.etat || 'Contrôle en cours'}`,
        date: retour.dateRetour,
        to: '/retours',
        icon: Wrench,
        tone: 'is-warning',
      })),
      ...reservations.slice(0, 4).map((reservation) => ({
        id: `res-${reservation.id}`,
        title: reservation.reference,
        meta: `${reservation.evenementNom} · ${reservation.statut}`,
        date: reservation.dateDebut,
        to: '/reservations',
        icon: BadgeCheck,
        tone: '',
      })),
    ]

    return items
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8)
  }, [emprunts, rapports, reservations, retours])

  const alerts = useMemo(() => {
    const items = []
    retards.slice(0, 3).forEach((emprunt) => {
      const emprunteur = utilisateurs.find((item) => item.id === emprunteurIdOf(emprunt))
      items.push({
        id: `late-${emprunt.id}`,
        title: `Retour en retard · ${emprunt.reference}`,
        text: `${emprunteur?.nom || 'Emprunteur inconnu'} · prévu le ${formatDate(emprunt.dateRetourPrevue)}`,
        status: 'En retard',
      })
    })
    stockFaible.slice(0, 2).forEach((materiel) => {
      items.push({
        id: `stock-${materiel.id}`,
        title: `Stock sous tension · ${materiel.nom}`,
        text: `${materiel.quantiteDisponible} / ${materiel.quantiteTotale} unités disponibles`,
        status: 'Critique',
      })
    })
    suspendedUsers.slice(0, 2).forEach((utilisateur) => {
      items.push({
        id: `user-${utilisateur.id}`,
        title: `Compte suspendu · ${utilisateur.nom}`,
        text: `${utilisateur.email} · ${utilisateur.role}`,
        status: 'Suspendu',
      })
    })
    return items
  }, [retards, stockFaible, suspendedUsers, utilisateurs])

  const storageSize = useMemo(() => {
    try {
      const size = Object.keys(window.localStorage)
        .filter((key) => key.startsWith('eventmanager:'))
        .reduce((total, key) => total + (window.localStorage.getItem(key)?.length || 0), 0)
      return size / 1024
    } catch {
      return 0
    }
  }, [])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Console administrateur"
        icon={<ShieldCheck size={12} />}
        title={`Administration · ${user?.nom || 'Régie'}`}
        subtitle="Vue consolidée des comptes, de la santé du système et des risques opérationnels du parc."
        meta={<span className="badge badge--violet">{user?.role || 'Administrateur'}</span>}
        actions={
          <>
            <Link className="btn btn-ghost" to="/parametres">
              <Settings size={14} />
              Paramètres système
            </Link>
            <Link className="btn btn-primary" to="/utilisateurs">
              <UserPlus size={14} />
              Gérer les comptes
            </Link>
          </>
        }
      />

      <div className="grid-kpi grid-kpi--4">
        <StatCard
          icon={<Users size={17} />}
          label="Comptes actifs"
          value={formatNumber(activeUsers.length)}
          unit={`/ ${formatNumber(utilisateurs.length)}`}
          tone="var(--cyan)"
          foot={`${admins.length} administrateur(s) · ${suspendedUsers.length} suspendu(s)`}
        />
        <StatCard
          icon={<Package size={17} />}
          label="Matériel disponible"
          value={formatNumber(quantiteDisponible)}
          unit={`/ ${formatNumber(quantiteTotale)}`}
          trend={`${tauxDisponibilite} %`}
          trendDirection={tauxDisponibilite >= 60 ? 'up' : 'down'}
          tone="var(--violet-light)"
          foot={`${materiels.length} références suivies au dépôt`}
        />
        <StatCard
          icon={<ArrowUpRight size={17} />}
          label="Mouvements en cours"
          value={formatNumber(actifs.length)}
          unit="emprunts"
          tone="var(--tertiary, var(--cyan))"
          foot={`${retours.length} retour(s) enregistré(s)`}
        />
        <StatCard
          icon={<AlertTriangle size={17} />}
          label="Alertes critiques"
          value={formatNumber(retards.length + endommages.length)}
          unit="incidents"
          trend={`${retards.length} retard(s)`}
          trendDirection={retards.length ? 'down' : 'flat'}
          tone="var(--danger)"
          foot={`${maintenance.length} matériel(s) en maintenance`}
        />
      </div>

      <div className="admin-layout">
        <div className="settings-col">
          <section className="glass-card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <Activity size={14} />
                  Actions d'administration
                </div>
                <p className="card-head__subtitle">
                  Accès directs aux consoles sensibles de l'instance.
                </p>
              </div>
              <span className="badge badge--cyan">Accès admin</span>
            </div>

            <div className="admin-actions">
              <Link className="admin-action" to="/utilisateurs">
                <span className="admin-action__icon is-violet">
                  <Users size={18} />
                </span>
                <span className="admin-action__body">
                  <strong>Comptes & habilitations</strong>
                  <span>Créer, suspendre et ajuster les droits du personnel.</span>
                </span>
                <ArrowRight size={15} />
              </Link>
              <Link className="admin-action" to="/parametres">
                <span className="admin-action__icon is-cyan">
                  <Settings size={18} />
                </span>
                <span className="admin-action__body">
                  <strong>Paramètres système</strong>
                  <span>Seuils, sécurité, RFID, API et sauvegardes.</span>
                </span>
                <ArrowRight size={15} />
              </Link>
              <Link className="admin-action" to="/rapports">
                <span className="admin-action__icon is-amber">
                  <FileText size={18} />
                </span>
                <span className="admin-action__body">
                  <strong>Rapports & exports</strong>
                  <span>Générer les bilans et archiver les analyses du parc.</span>
                </span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </section>

          <section className="glass-card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <AlertTriangle size={14} />
                  Points de vigilance
                </div>
                <p className="card-head__subtitle">
                  Incidents à traiter en priorité par la régie.
                </p>
              </div>
              <span className="badge badge--danger">{alerts.length}</span>
            </div>

            {alerts.length ? (
              <div className="role-list">
                {alerts.map((alert) => (
                  <div className="role-row" key={alert.id}>
                    <div>
                      <div className="role-row__name">{alert.title}</div>
                      <div className="role-row__desc">{alert.text}</div>
                    </div>
                    <StatusBadge status={alert.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ShieldCheck size={20} />}
                title="Parc sous contrôle"
                text="Aucun retard, compte suspendu ou stock critique à signaler."
              />
            )}
          </section>

          <section className="glass-card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <Activity size={14} />
                  Activité récente
                </div>
                <p className="card-head__subtitle">
                  Derniers mouvements et documents produits sur l'instance.
                </p>
              </div>
            </div>

            <div className="admin-activity">
              {activity.map((item) => {
                const Icon = item.icon
                return (
                  <Link className="admin-activity__row" to={item.to} key={item.id}>
                    <span className={`popover__item-icon ${item.tone}`.trim()}>
                      <Icon size={14} />
                    </span>
                    <span className="admin-activity__body">
                      <strong>{item.title}</strong>
                      <span>{item.meta}</span>
                    </span>
                    <span className="admin-activity__date">{formatDate(item.date)}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>

        <div className="settings-col">
          <section className="glass-card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <Database size={14} />
                  Santé du système
                </div>
                <p className="card-head__subtitle">Services et infrastructure locale.</p>
              </div>
              <span className="badge badge--success">Opérationnel</span>
            </div>

            <div className="admin-health">
              <div className="admin-health__row">
                <span className="admin-health__icon">
                  <KeyRound size={14} />
                </span>
                <div>
                  <strong>API REST & GraphQL</strong>
                  <span>{parametres.api.url}</span>
                </div>
                <StatusBadge status="En ligne" />
              </div>
              <div className="admin-health__row">
                <span className="admin-health__icon">
                  <RadioTower size={14} />
                </span>
                <div>
                  <strong>Borne RFID</strong>
                  <span>{parametres.rfid.borne}</span>
                </div>
                <StatusBadge status={parametres.rfid.actif ? 'En ligne' : 'Inactif'} />
              </div>
              <div className="admin-health__row">
                <span className="admin-health__icon">
                  <Database size={14} />
                </span>
                <div>
                  <strong>Stockage local</strong>
                  <span>{formatNumber(storageSize, { maximumFractionDigits: 1 })} Ko utilisés</span>
                </div>
                <span className="badge badge--cyan">Sync 12 ms</span>
              </div>
              <div className="admin-health__row">
                <span className="admin-health__icon">
                  <ShieldCheck size={14} />
                </span>
                <div>
                  <strong>Sauvegarde automatique</strong>
                  <span>Dernier instantané · {parametres.api.derniereSauvegarde}</span>
                </div>
                <StatusBadge status={parametres.api.sauvegardeAuto ? 'Actif' : 'Manuel'} />
              </div>
            </div>
          </section>

          <section className="glass-card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <Users size={14} />
                  Rôles & couverture
                </div>
                <p className="card-head__subtitle">Répartition des accès sur le parc.</p>
              </div>
            </div>

            <div className="admin-roles">
              {ROLES_UTILISATEUR.map((role) => {
                const count = roleCounts[role] || 0
                const share = utilisateurs.length ? (count / utilisateurs.length) * 100 : 0
                return (
                  <div className="admin-role" key={role}>
                    <div className="admin-role__head">
                      <span>{role}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="progress progress--sm">
                      <div
                        className="progress__bar"
                        style={{
                          width: `${share}%`,
                          '--tone': role === 'Administrateur' ? 'var(--violet-light)' : 'var(--cyan)',
                        }}
                      />
                    </div>
                    <span className="admin-role__share">{formatPercent(share)}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="glass-card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <Package size={14} />
                  Inventaire sous tension
                </div>
                <p className="card-head__subtitle">
                  Références sous le seuil d'alerte de {parametres.stock.seuilAlerte} %.
                </p>
              </div>
              <span className="badge badge--warning">{stockFaible.length}</span>
            </div>

            {stockFaible.length ? (
              <div className="role-list">
                {stockFaible.slice(0, 5).map((materiel) => {
                  const rate = materiel.quantiteTotale
                    ? (materiel.quantiteDisponible / materiel.quantiteTotale) * 100
                    : 0
                  return (
                    <div className="role-row" key={materiel.id}>
                      <div style={{ minWidth: 0 }}>
                        <div className="role-row__name">{materiel.nom}</div>
                        <div className="role-row__desc mono">{materiel.reference}</div>
                      </div>
                      <span className="role-row__count">
                        {materiel.quantiteDisponible}/{materiel.quantiteTotale}
                      </span>
                      <div className="progress progress--sm" style={{ width: 58 }}>
                        <div
                          className="progress__bar"
                          style={{
                            width: `${Math.min(100, rate)}%`,
                            '--tone': rate <= 10 ? 'var(--danger)' : 'var(--warning)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Package size={20} />}
                title="Stock sain"
                text="Toutes les références sont au-dessus du seuil d'alerte."
              />
            )}
          </section>

          <section className="glass-card">
            <div className="card-head">
              <div>
                <div className="card-head__title">
                  <ShieldCheck size={14} />
                  Session administrateur
                </div>
                <p className="card-head__subtitle">Contexte de sécurité courant.</p>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item__label">Compte</div>
                <div className="detail-item__value">{user?.nom}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Rôle</div>
                <div className="detail-item__value">{user?.role}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Connexion</div>
                <div className="detail-item__value">{formatDateTime(session?.loginAt)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item__label">Méthode</div>
                <div className="detail-item__value">Session locale</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Admin
