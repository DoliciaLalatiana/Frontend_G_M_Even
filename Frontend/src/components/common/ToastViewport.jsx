import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const TOAST_TONES = {
  success: 'var(--success)',
  error: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--cyan)',
}

const ToastViewport = ({ toasts, onClose }) => {
  if (!toasts.length) return null

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.type] || Info
        return (
          <div
            key={toast.id}
            className="toast"
            style={{ '--tone': TOAST_TONES[toast.type] || TOAST_TONES.info }}
          >
            <div className="toast__icon">
              <Icon size={15} />
            </div>
            <div className="toast__body">
              <div className="toast__title">{toast.title}</div>
              {toast.message && <div className="toast__message">{toast.message}</div>}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => onClose(toast.id)}
              aria-label="Fermer la notification"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default ToastViewport
