import { NavLink } from 'react-router-dom'
import { Boxes, RadioTower, X } from 'lucide-react'
import { APP_VERSION, NAV_ITEMS } from '../../utils/constants'
import { getIcon } from '../../utils/icons'

const Sidebar = ({ open, onClose }) => (
  <aside className={`sidebar ${open ? 'is-open' : ''}`.trim()} aria-label="Navigation principale">
    <div className="sidebar__brand">
      <div className="brand">
        <div className="brand__mark">
          <Boxes size={19} />
        </div>
        <div className="brand__text">
          <span className="brand__title">EVENT MANAGER</span>
          <span className="brand__subtitle">Logistics Core</span>
        </div>
      </div>
      <div className="sidebar__live-dot" />
      <button type="button" className="sidebar__close" onClick={onClose} aria-label="Fermer le menu">
        <X size={16} />
      </button>
    </div>

    <div className="sidebar__context">
      <div className="sidebar__context-inner">
        <span className="sidebar__context-label">Parc opérationnel</span>
        <span className="sidebar__context-code">PROD-FR01</span>
      </div>
    </div>

    <nav className="sidebar__nav">
      {NAV_ITEMS.map((item) => {
        const Icon = getIcon(item.icon)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`.trim()}
          >
            <Icon size={18} />
            <span>{item.label}</span>
            <span className="sidebar__link-dot" />
          </NavLink>
        )
      })}
    </nav>

    <div className="sidebar__footer">
      <div className="telemetry-card">
        <div className="telemetry-card__left">
          <RadioTower size={14} />
          <span>Nœud télémétrie</span>
        </div>
        <span className="badge badge--cyan">
          <span className="badge__dot" />
          En ligne
        </span>
      </div>
      <div className="sidebar__version">
        <span>{APP_VERSION}</span>
        <span>SYNC 12 ms</span>
      </div>
    </div>
  </aside>
)

export default Sidebar
