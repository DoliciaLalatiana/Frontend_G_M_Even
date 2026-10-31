import { Inbox } from 'lucide-react'

const EmptyState = ({ icon, title = 'Aucun élément', text, action }) => (
  <div className="empty-state">
    <div className="empty-state__icon">{icon || <Inbox size={22} />}</div>
    <div className="empty-state__title">{title}</div>
    {text && <p className="empty-state__text">{text}</p>}
    {action}
  </div>
)

export default EmptyState
