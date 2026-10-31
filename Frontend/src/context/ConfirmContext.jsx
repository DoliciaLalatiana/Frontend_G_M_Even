import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import ConfirmModal from '../components/common/ConfirmModal'

const ConfirmContext = createContext(null)

export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null)

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setDialog({ ...options, resolve })
      }),
    [],
  )

  const close = useCallback(
    (result) => {
      dialog?.resolve(result)
      setDialog(null)
    },
    [dialog],
  )

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmModal
        open={Boolean(dialog)}
        title={dialog?.title || 'Confirmer l’action'}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel || 'Confirmer'}
        cancelLabel={dialog?.cancelLabel || 'Annuler'}
        tone={dialog?.tone || 'danger'}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm doit être utilisé dans ConfirmProvider')
  return context.confirm
}
