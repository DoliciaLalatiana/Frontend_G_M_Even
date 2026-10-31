import { STORAGE_PREFIX } from '../utils/constants'

const fullKey = (key) => `${STORAGE_PREFIX}${key}`

export const loadCollection = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(fullKey(key))
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch (error) {
    console.warn(`Impossible de charger "${key}" depuis le stockage local.`, error)
    return fallback
  }
}

export const saveCollection = (key, value) => {
  try {
    window.localStorage.setItem(fullKey(key), JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`Impossible d'enregistrer "${key}" dans le stockage local.`, error)
    return false
  }
}

export const removeCollection = (key) => {
  try {
    window.localStorage.removeItem(fullKey(key))
    return true
  } catch (error) {
    console.warn(`Impossible de supprimer "${key}".`, error)
    return false
  }
}

export const resetApplicationData = () => {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => window.localStorage.removeItem(key))
    return true
  } catch (error) {
    console.warn('Réinitialisation impossible.', error)
    return false
  }
}

export const createId = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
