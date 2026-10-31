import { useCallback, useEffect, useState } from 'react'
import { loadCollection, saveCollection } from '../services/dataService'

export const usePersistentState = (key, initialValue) => {
  const [value, setValue] = useState(() => loadCollection(key, initialValue))

  useEffect(() => {
    saveCollection(key, value)
  }, [key, value])

  const reset = useCallback(() => setValue(initialValue), [initialValue])

  return [value, setValue, reset]
}
