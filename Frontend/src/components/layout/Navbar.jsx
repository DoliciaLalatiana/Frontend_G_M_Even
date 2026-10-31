import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarPlus,
  ChevronRight,
  CircleAlert,
  Info,
  Menu,
  Package,
  PackagePlus,
  Plus,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { getRetoursEnAttente, getStockFaible } from '../../services/stockService'
import { NAV_ITEMS } from '../../utils/constants'
import { daysUntil, formatDateShort, initials, todayISO } from '../../utils/format'
import { getIcon } from '../../utils/icons'
import SearchBar from '../common/SearchBar'

const QUICK_ACTIONS = [
  { label: 'Nouveau matériel', to: '/materiels?new=1', icon: PackagePlus },
  { label: 'Nouvel emprunt', to: '/emprunts?new=1', icon: CalendarPlus },
  { label: 'Nouvelle réservation', to: '/reservations?new=1', icon: CalendarPlus },
  { label: 'Nouvel événement', to: '/evenements?new=1', icon: CalendarPlus },
]

const SEARCH_TYPES = {
  materiel: { icon: Package, label: 'Matériel' },
  evenement: { icon: CalendarPlus, label: 'Événement' },
  emprunt: { icon: CircleAlert, label: 'Emprunt' },
  utilisateur: { icon: Users, label: 'Utilisateur' },
  categorie: { icon: Package, label: 'Catégorie' },
}

const Navbar = ({ onMenu }) => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const {
    materiels,
    categories,
    evenements,
    emprunts,
    retours,
    reservations,
    utilisateurs,
    parametres,
  } = useData()

  const [query, setQuery] = useState('')
  const [quickOpen, setQuickOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const searchRef = useRef(null)
  const quickRef = useRef(null)
  const notifRef = useRef(null)
  const inputRef = useRef(null)

  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.to))
  const profile = parametres?.profil || {}
  const displayName = profile.nom || 'Alexandre Mercier'

  const alerts = useMemo(() => {
    const items = []
    getRetoursEnAttente(emprunts)
      .filter((emprunt) => emprunt.statut === 'En retard')
      .slice(0, 2)
      .forEach((emprunt) => {
        items.push({
          id: `retard-${emprunt.id}`,
          tone: 'danger',
          icon: TriangleAlert,
          title: `Retour en retard — ${emprunt.reference}`,
          text: `Restitution prévue le ${formatDateShort(emprunt.dateRetourPrevue)}.`,
          to: '/retours',
        })
      })

    getStockFaible(materiels, 25)
      .slice(0, 2)
      .forEach((materiel) => {
        items.push({
          id: `stock-${materiel.id}`,
          tone: 'warning',
          icon: Package,
          title: `Stock faible — ${materiel.nom}`,
          text: `${materiel.quantiteDisponible} / ${materiel.quantiteTotale} unités disponibles.`,
          to: '/materiels',
        })
      })

    const upcoming = reservations
      .filter(
        (reservation) =>
          reservation.statut !== 'Annulée' &&
          daysUntil(reservation.dateDebut) >= 0 &&
          daysUntil(reservation.dateDebut) <= 7,
      )
      .slice(0, 1)

    upcoming.forEach((reservation) => {
      items.push({
        id: `res-${reservation.id}`,
        tone: 'cyan',
        icon: Info,
        title: `Départ proche — ${reservation.reference}`,
        text: `${reservation.evenementNom} dans ${daysUntil(reservation.dateDebut)} jour(s).`,
        to: '/reservations',
      })
    })

    return items.slice(0, 5)
  }, [emprunts, materiels, reservations])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (term.length < 2) return []
    const found = []

    materiels.forEach((materiel) => {
      if (
        materiel.nom.toLowerCase().includes(term) ||
        materiel.reference.toLowerCase().includes(term) ||
        materiel.marque?.toLowerCase().includes(term)
      ) {
        found.push({
          id: `mat-${materiel.id}`,
          type: 'materiel',
          label: materiel.nom,
          meta: `${materiel.reference} · ${materiel.quantiteDisponible} dispo`,
          to: `/materiels?search=${encodeURIComponent(materiel.reference)}`,
        })
      }
    })

    evenements.forEach((evenement) => {
      if (
        evenement.nom.toLowerCase().includes(term) ||
        evenement.lieu.toLowerCase().includes(term)
      ) {
        found.push({
          id: `evt-${evenement.id}`,
          type: 'evenement',
          label: evenement.nom,
          meta: `${formatDateShort(evenement.dateDebut)} · ${evenement.lieu}`,
          to: '/evenements',
        })
      }
    })

    emprunts.forEach((emprunt) => {
      const emprunteur = utilisateurs.find((item) => item.id === emprunt.emprunteurId)
      if (
        emprunt.reference.toLowerCase().includes(term) ||
        emprunteur?.nom.toLowerCase().includes(term)
      ) {
        found.push({
          id: `emp-${emprunt.id}`,
          type: 'emprunt',
          label: emprunt.reference,
          meta: `${emprunteur?.nom || 'Emprunteur'} · ${emprunt.statut}`,
          to: '/emprunts',
        })
      }
    })

    utilisateurs.forEach((utilisateur) => {
      if (
        utilisateur.nom.toLowerCase().includes(term) ||
        utilisateur.email.toLowerCase().includes(term)
      ) {
        found.push({
          id: `usr-${utilisateur.id}`,
          type: 'utilisateur',
          label: utilisateur.nom,
          meta: utilisateur.email,
          to: '/utilisateurs',
        })
      }
    })

    categories.forEach((categorie) => {
      if (categorie.nom.toLowerCase().includes(term)) {
        found.push({
          id: `cat-${categorie.id}`,
          type: 'categorie',
          label: categorie.nom,
          meta: 'Catégorie de matériel',
          to: '/categories',
        })
      }
    })

    return found.slice(0, 7)
  }, [categories, emprunts, evenements, materiels, query, utilisateurs])

  useEffect(() => {
    const handler = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchFocused(false)
      if (!quickRef.current?.contains(event.target)) setQuickOpen(false)
      if (!notifRef.current?.contains(event.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setSearchFocused(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    setQuery('')
    setSearchFocused(false)
    setQuickOpen(false)
    setNotifOpen(false)
  }, [pathname])

  const goTo = (path) => {
    navigate(path)
    setQuery('')
    setSearchFocused(false)
    setQuickOpen(false)
    setNotifOpen(false)
  }

  const submitSearch = (event) => {
    if (event.key === 'Enter') {
      if (results.length) goTo(results[0].to)
      else if (query.trim()) goTo(`/materiels?search=${encodeURIComponent(query.trim())}`)
    }
  }

  const notifTone = (tone) => {
    if (tone === 'danger') return 'is-danger'
    if (tone === 'warning') return 'is-warning'
    return ''
  }

  return (
    <header className="navbar">
      <button type="button" className="navbar__menu" onClick={onMenu} aria-label="Ouvrir le menu">
        <Menu size={18} />
      </button>

      <div className="breadcrumb">
        <span className="breadcrumb__root">Hub</span>
        <ChevronRight size={11} className="breadcrumb__sep" />
        <span className="breadcrumb__current">{current?.label || 'Supervision'}</span>
      </div>

      <div className="navbar__search" ref={searchRef}>
        <SearchBar
          value={query}
          onChange={(value) => {
            setQuery(value)
            setSearchFocused(true)
          }}
          onFocus={() => setSearchFocused(true)}
          inputRef={inputRef}
          placeholder="Rechercher réf., matériel, événement, technicien…"
          ariaLabel="Recherche globale"
        />
        <span
          className="kbd"
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          ⌘K
        </span>
        {searchFocused && query.trim().length >= 2 && (
          <div className="navbar__results" onKeyDown={submitSearch}>
            {results.length ? (
              results.map((result) => {
                const config = SEARCH_TYPES[result.type] || SEARCH_TYPES.materiel
                const Icon = config.icon
                return (
                  <button
                    type="button"
                    key={result.id}
                    className="search-result"
                    onClick={() => goTo(result.to)}
                  >
                    <span className="search-result__icon">
                      <Icon size={14} />
                    </span>
                    <span className="search-result__body">
                      <span className="search-result__title">{result.label}</span>
                      <span className="search-result__meta">
                        {config.label} · {result.meta}
                      </span>
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="search-result__empty">
                Aucun résultat pour « {query.trim()} ».
              </div>
            )}
          </div>
        )}
      </div>

      <div className="navbar__actions">
        <div className="quick-action-wrap" ref={quickRef}>
          <button
            type="button"
            className={`btn btn-primary ${quickOpen ? 'is-open' : ''}`}
            onClick={() => {
              setQuickOpen((open) => !open)
              setNotifOpen(false)
            }}
          >
            <Plus size={15} />
            <span className="label">Action rapide</span>
          </button>
          {quickOpen && (
            <div className="navbar__popover" style={{ width: 260 }}>
              <div className="popover__head">
                <span className="popover__title">Créer rapidement</span>
              </div>
              <div className="popover__list">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      type="button"
                      key={action.label}
                      className="popover__item"
                      onClick={() => goTo(action.to)}
                    >
                      <span className="popover__item-icon">
                        <Icon size={15} />
                      </span>
                      <span>
                        <span className="popover__item-title">{action.label}</span>
                        <span className="popover__item-text">Ouvrir le formulaire sécurisé</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div ref={notifRef}>
          <button
            type="button"
            className={`icon-action ${notifOpen ? 'is-open' : ''}`}
            onClick={() => {
              setNotifOpen((open) => !open)
              setQuickOpen(false)
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {alerts.length > 0 && <span className="icon-action__dot" />}
          </button>
          {notifOpen && (
            <div className="navbar__popover">
              <div className="popover__head">
                <span className="popover__title">Centre d’alertes</span>
                <span className="badge badge--cyan">{alerts.length} actives</span>
              </div>
              <div className="popover__list">
                {alerts.length ? (
                  alerts.map((alert) => {
                    const Icon = alert.icon
                    return (
                      <button
                        type="button"
                        key={alert.id}
                        className="popover__item"
                        onClick={() => goTo(alert.to)}
                      >
                        <span className={`popover__item-icon ${notifTone(alert.tone)}`}>
                          <Icon size={15} />
                        </span>
                        <span>
                          <span className="popover__item-title">{alert.title}</span>
                          <span className="popover__item-text">{alert.text}</span>
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <div className="popover__empty">Aucune alerte en cours. Parc sous contrôle.</div>
                )}
              </div>
              <div className="popover__foot">Dernière synchronisation : {formatDateShort(todayISO())}</div>
            </div>
          )}
        </div>

        <div className="navbar__divider" />

        <button
          type="button"
          className="user-chip"
          onClick={() => goTo('/parametres')}
          aria-label="Ouvrir le profil et les paramètres"
        >
          <span className="avatar">{initials(displayName)}</span>
          <span className="user-chip__text">
            <span className="user-chip__name">{displayName}</span>
            <span className="user-chip__role">
              {profile.role || 'Régisseur Général'}
              <span className="mini-tag">Admin</span>
            </span>
          </span>
        </button>
      </div>
    </header>
  )
}

export default Navbar
