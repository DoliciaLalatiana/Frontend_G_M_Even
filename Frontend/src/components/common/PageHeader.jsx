import { Sparkles } from 'lucide-react'

const PageHeader = ({ eyebrow, title, subtitle, actions, meta, icon }) => (
  <div className="page-header">
    <div>
      {(eyebrow || icon) && (
        <div className="page-header__eyebrow">
          {icon || <Sparkles size={12} />}
          {eyebrow || 'Logistics Core'}
        </div>
      )}
      <h1 className="page-header__title">{title}</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </div>
    {(actions || meta) && (
      <div className="page-header__actions">
        {meta && <div className="page-header__meta">{meta}</div>}
        {actions}
      </div>
    )}
  </div>
)

export default PageHeader
