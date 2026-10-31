import { AlertTriangle, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'

const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.()
      }}
      role="presentation"
    >
      <div className="modal modal--sm" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <div className="modal__title">Confirmation requise</div>
          <button type="button" className="modal__close" onClick={onCancel} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
        <div className="modal__body">
          <div className="confirm">
            <div
              className="confirm__icon"
              style={tone === 'warning' ? { color: 'var(--warning)', background: 'rgba(255,183,67,.1)', borderColor: 'rgba(255,183,67,.24)' } : undefined}
            >
              <AlertTriangle size={24} />
            </div>
            <div className="confirm__title">{title}</div>
            {message && <p className="confirm__text">{message}</p>}
            <div className="confirm__actions">
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                type="button"
                className={tone === 'warning' ? 'btn btn-primary' : 'btn btn-danger'}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmModal
