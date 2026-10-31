import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  variant = 'modal',
}) => {
  useEffect(() => {
    if (!open) return undefined

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  const sizeClass = size === 'sm' ? 'modal--sm' : size === 'lg' ? 'modal--lg' : size === 'xl' ? 'modal--xl' : ''
  const isDrawer = variant === 'drawer'

  return createPortal(
    <div
      className={`overlay ${isDrawer ? 'overlay--drawer' : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
      role="presentation"
    >
      <div
        className={isDrawer ? 'drawer' : `modal ${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Fenêtre de dialogue'}
      >
        <div className="modal__header">
          <div>
            <div className="modal__title">
              {icon}
              <span>{title}</span>
            </div>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export default Modal
