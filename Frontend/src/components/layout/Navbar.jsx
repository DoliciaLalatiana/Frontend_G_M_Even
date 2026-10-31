import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarPlus,
  ChevronRight,
  Info,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  Plus,
  Settings,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import {
  getRetoursEnAttente,
  getStockFaible,
} from "../../services/stockService";
import { NAV_ITEMS } from "../../utils/constants";
import {
  daysUntil,
  formatDateShort,
  initials,
  todayISO,
} from "../../utils/format";
import { getIcon } from "../../utils/icons";

const QUICK_ACTIONS = [
  { label: "Nouveau matériel", to: "/materiels?new=1", icon: PackagePlus },
  { label: "Nouvel emprunt", to: "/emprunts?new=1", icon: CalendarPlus },
  {
    label: "Nouvelle réservation",
    to: "/reservations?new=1",
    icon: CalendarPlus,
  },
  { label: "Nouvel événement", to: "/evenements?new=1", icon: CalendarPlus },
];

const Navbar = ({ onMenu }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { materiels, emprunts, reservations, parametres } = useData();

  const [quickOpen, setQuickOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const quickRef = useRef(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.to));
  const profile = parametres?.profil || {};
  const displayName = profile.nom || "Alexandre Mercier";

  const alerts = useMemo(() => {
    const items = [];
    getRetoursEnAttente(emprunts)
      .filter((emprunt) => emprunt.statut === "En retard")
      .slice(0, 2)
      .forEach((emprunt) => {
        items.push({
          id: `retard-${emprunt.id}`,
          tone: "danger",
          icon: TriangleAlert,
          title: `Retour en retard — ${emprunt.reference}`,
          text: `Restitution prévue le ${formatDateShort(emprunt.dateRetourPrevue)}.`,
          to: "/retours",
        });
      });

    getStockFaible(materiels, 25)
      .slice(0, 2)
      .forEach((materiel) => {
        items.push({
          id: `stock-${materiel.id}`,
          tone: "warning",
          icon: Package,
          title: `Stock faible — ${materiel.nom}`,
          text: `${materiel.quantiteDisponible} / ${materiel.quantiteTotale} unités disponibles.`,
          to: "/materiels",
        });
      });

    const upcoming = reservations
      .filter(
        (reservation) =>
          reservation.statut !== "Annulée" &&
          daysUntil(reservation.dateDebut) >= 0 &&
          daysUntil(reservation.dateDebut) <= 7,
      )
      .slice(0, 1);

    upcoming.forEach((reservation) => {
      items.push({
        id: `res-${reservation.id}`,
        tone: "cyan",
        icon: Info,
        title: `Départ proche — ${reservation.reference}`,
        text: `${reservation.evenementNom} dans ${daysUntil(reservation.dateDebut)} jour(s).`,
        to: "/reservations",
      });
    });

    return items.slice(0, 5);
  }, [emprunts, materiels, reservations]);

  useEffect(() => {
    const handler = (event) => {
      if (!quickRef.current?.contains(event.target)) setQuickOpen(false);
      if (!notifRef.current?.contains(event.target)) setNotifOpen(false);
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setQuickOpen(false);
    setNotifOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const goTo = (path) => {
    navigate(path);
    setQuickOpen(false);
    setNotifOpen(false);
  };

  const notifTone = (tone) => {
    if (tone === "danger") return "is-danger";
    if (tone === "warning") return "is-warning";
    return "";
  };

  return (
    <header className="navbar">
      <button
        type="button"
        className="navbar__menu"
        onClick={onMenu}
        aria-label="Ouvrir le menu"
      >
        <Menu size={18} />
      </button>

      <div className="breadcrumb">
        <span className="breadcrumb__root">Hub</span>
        <ChevronRight size={11} className="breadcrumb__sep" />
        <span className="breadcrumb__current">
          {current?.label || "Supervision"}
        </span>
      </div>

      <div className="navbar__actions">
        <div className="quick-action-wrap" ref={quickRef}>
          <button
            type="button"
            className={`btn btn-primary ${quickOpen ? "is-open" : ""}`}
            onClick={() => {
              setQuickOpen((open) => !open);
              setNotifOpen(false);
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
                  const Icon = action.icon;
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
                        <span className="popover__item-title">
                          {action.label}
                        </span>
                        <span className="popover__item-text">
                          Ouvrir le formulaire sécurisé
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div ref={notifRef}>
          <button
            type="button"
            className={`icon-action ${notifOpen ? "is-open" : ""}`}
            onClick={() => {
              setNotifOpen((open) => !open);
              setQuickOpen(false);
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
                <span className="badge badge--cyan">
                  {alerts.length} actives
                </span>
              </div>
              <div className="popover__list">
                {alerts.length ? (
                  alerts.map((alert) => {
                    const Icon = alert.icon;
                    return (
                      <button
                        type="button"
                        key={alert.id}
                        className="popover__item"
                        onClick={() => goTo(alert.to)}
                      >
                        <span
                          className={`popover__item-icon ${notifTone(alert.tone)}`}
                        >
                          <Icon size={15} />
                        </span>
                        <span>
                          <span className="popover__item-title">
                            {alert.title}
                          </span>
                          <span className="popover__item-text">
                            {alert.text}
                          </span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="popover__empty">
                    Aucune alerte en cours. Parc sous contrôle.
                  </div>
                )}
              </div>
              <div className="popover__foot">
                Dernière synchronisation : {formatDateShort(todayISO())}
              </div>
            </div>
          )}
        </div>

        <div className="user-menu-wrap" ref={userMenuRef}>
          <button
            type="button"
            className="user-chip"
            onClick={() => {
              setUserMenuOpen((open) => !open);
              setQuickOpen(false);
              setNotifOpen(false);
            }}
            aria-label="Ouvrir le menu utilisateur"
          >
            <span className="avatar">{initials(displayName)}</span>
            <span className="user-chip__text">
              <span className="user-chip__name">{displayName}</span>
              <span className="user-chip__role">
                {profile.role || "Régisseur Général"}
                <span className="mini-tag">Admin</span>
              </span>
            </span>
          </button>

          {userMenuOpen && (
            <div className="navbar__popover user-menu-popover">
              <div className="popover__head user-menu__head">
                <span className="popover__title">Compte</span>
              </div>
              <div className="popover__list user-menu__list">
                <button
                  type="button"
                  className="popover__item user-menu__item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    goTo("/parametres");
                  }}
                >
                  <span className="popover__item-icon is-violet">
                    <Settings size={15} />
                  </span>
                  <span className="popover__item-title">Paramètres</span>
                </button>

                <button
                  type="button"
                  className="popover__item user-menu__item user-menu__logout"
                  onClick={() => {
                    setUserMenuOpen(false);
                    signOut();
                  }}
                >
                  <span className="popover__item-icon is-danger">
                    <LogOut size={15} />
                  </span>
                  <span className="popover__item-title">Déconnexion</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
