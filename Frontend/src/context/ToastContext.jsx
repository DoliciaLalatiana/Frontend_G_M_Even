import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import ToastViewport from '../components/common/ToastViewport'

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const pushToast = useCallback(
    (payload, type = 'success') => {
      const toast =
        typeof payload === 'string'
          ? { title: payload, type }
          : {
              title: payload.title || '',
              message: payload.message || '',
              type: payload.type || type,
            }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setToasts((current) => [...current.slice(-3), { ...toast, id }])
      timers.current[id] = setTimeout(() => removeToast(id), 4200)
      return id
    },
    [removeToast],
  )

  const value = useMemo(() => ({ pushToast, removeToast }), [pushToast, removeToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast doit être utilisé dans ToastProvider')
  return context
}
