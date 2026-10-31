const parseDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (value, options = {}) => {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

export const formatDateShort = (value) => {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export const formatDateLong = (value) => {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const formatDateTime = (value) => {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatMonth = (date = new Date()) =>
  date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

export const toISODate = (value = new Date()) => {
  const date = parseDate(value)
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayISO = () => toISODate(new Date())

export const formatNumber = (value, options = {}) =>
  new Intl.NumberFormat('fr-FR', options).format(Number(value) || 0)

export const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

export const formatPercent = (value, digits = 0) =>
  `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0)} %`

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export const daysBetween = (start, end) => {
  const a = parseDate(start)
  const b = parseDate(end)
  if (!a || !b) return 0
  return Math.round((b - a) / 86400000)
}

export const daysUntil = (value) => {
  const target = parseDate(value)
  if (!target) return 0
  const today = parseDate(todayISO())
  return Math.round((target - today) / 86400000)
}

export const isOverdue = (dateRetourPrevue, dateRetourReelle, statut) => {
  if (dateRetourReelle || statut === 'Retourné') return false
  return daysUntil(dateRetourPrevue) < 0
}

export const periodLabel = (dateDebut, dateFin) => {
  if (!dateDebut && !dateFin) return '—'
  if (dateDebut === dateFin) return formatDate(dateDebut)
  const start = parseDate(dateDebut)
  const end = parseDate(dateFin)
  if (!end) return formatDate(dateDebut)
  if (start && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} – ${formatDate(dateFin)}`
  }
  return `${formatDate(dateDebut)} → ${formatDate(dateFin)}`
}

export const truncate = (value = '', length = 60) =>
  value.length > length ? `${value.slice(0, length).trim()}…` : value

export const nextReference = (prefix, items = [], pad = 4) => {
  const year = new Date().getFullYear()
  const numbers = items
    .map((item) => String(item.reference || '').match(/(\d+)$/))
    .filter(Boolean)
    .map((match) => Number(match[1]))
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1
  return `${prefix}-${year}-${String(next).padStart(pad, '0')}`
}
