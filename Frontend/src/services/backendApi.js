
const API_BASE = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
).replace(/\/$/, '')

const ACCESS_KEY = 'event-manager-access'
const REFRESH_KEY = 'event-manager-refresh'

export const tokenStore = {
  access: () => localStorage.getItem(ACCESS_KEY),

  refresh: () => localStorage.getItem(REFRESH_KEY),

  save: ({ access, refresh }) => {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },

  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

async function readResponse(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

function getErrorMessage(payload, status) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (payload?.detail) {
    return payload.detail
  }

  if (payload?.message) {
    return payload.message
  }

  if (payload && typeof payload === 'object') {
    const messages = Object.entries(payload).map(([key, value]) => {
      const details = Array.isArray(value)
        ? value.join(', ')
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)

      return `${key}: ${details}`
    })

    if (messages.length) return messages.join('\n')
  }

  return `Erreur HTTP ${status}`
}

async function refreshAccessToken() {
  const refresh = tokenStore.refresh()

  if (!refresh) return false

  try {
    const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh }),
    })

    if (!response.ok) {
      tokenStore.clear()
      return false
    }

    const data = await response.json()

    tokenStore.save(data)

    return Boolean(data.access)
  } catch {
    return false
  }
}

export async function apiRequest(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {})
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  if (options.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Accept', 'application/json')

  const access = tokenStore.access()

  if (access) {
    headers.set('Authorization', `Bearer ${access}`)
  }

  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

  let response

  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch {
    const error = new Error(
      'Impossible de contacter le serveur. Vérifiez que le backend Django est démarré et que votre connexion fonctionne.',
    )
    error.status = 0
    throw error
  }

  if (
    response.status === 401 &&
    retry &&
    await refreshAccessToken()
  ) {
    headers.set('Authorization', `Bearer ${tokenStore.access()}`)

    try {
      response = await fetch(url, {
        ...options,
        headers,
      })
    } catch {
      const error = new Error(
        'La connexion au serveur a été interrompue.',
      )
      error.status = 0
      throw error
    }
  }

  if (!response.ok) {
    const payload = await readResponse(response).catch(() => null)

    const error = new Error(
      getErrorMessage(payload, response.status),
    )

    error.status = response.status
    error.payload = payload

    throw error
  }

  const data = await readResponse(response)

  return data
}

const json = (method, body) => ({
  method,
  body: JSON.stringify(body),
})

export const backendApi = {
  auth: {
    async login(email, password) {
      const data = await apiRequest(
        '/auth/token/',
        json('POST', { email, password }),
        false,
      )

      tokenStore.save(data)

      return data
    },

    me: () => apiRequest('/auth/me/'),

    logout: () => tokenStore.clear(),

    changePassword: (body) =>
      apiRequest('/auth/password/', json('POST', body)),
  },

  dashboard: () => apiRequest('/dashboard/'),

  categories: {
    list: () => apiRequest('/categories/'),

    create: (body) =>
      apiRequest('/categories/', json('POST', body)),

    update: (id, body) =>
      apiRequest(`/categories/${id}/`, json('PATCH', body)),

    remove: (id) =>
      apiRequest(`/categories/${id}/`, { method: 'DELETE' }),
  },

  materiels: {
    list: (query = '') =>
      apiRequest(`/materiels/${query}`),

    create: (body) =>
      apiRequest('/materiels/', json('POST', body)),

    update: (id, body) =>
      apiRequest(`/materiels/${id}/`, json('PATCH', body)),

    remove: (id) =>
      apiRequest(`/materiels/${id}/`, { method: 'DELETE' }),
  },

  evenements: {
    list: () =>
      apiRequest('/evenements/'),

    create: (body) =>
      apiRequest('/evenements/', json('POST', body)),

    update: (id, body) =>
      apiRequest(`/evenements/${id}/`, json('PATCH', body)),

    remove: (id) =>
      apiRequest(`/evenements/${id}/`, { method: 'DELETE' }),
  },

  emprunts: {
    list: () =>
      apiRequest('/emprunts/'),

    create: (body) =>
      apiRequest('/emprunts/', json('POST', body)),

    update: (id, body) =>
      apiRequest(`/emprunts/${id}/`, json('PATCH', body)),

    retour: (id, body) =>
      apiRequest(`/emprunts/${id}/retours/`, json('POST', body)),
  },

  reservations: {
    list: () =>
      apiRequest('/reservations/'),

    create: (body) =>
      apiRequest('/reservations/', json('POST', body)),

    update: (id, body) =>
      apiRequest(`/reservations/${id}/`, json('PATCH', body)),

    annuler: (id) =>
      apiRequest(`/reservations/${id}/annuler/`, json('POST', {})),
  },

  retours: {
    list: () =>
      apiRequest('/retours/'),
  },

  utilisateurs: {
    list: () =>
      apiRequest('/utilisateurs/'),

    create: (body) =>
      apiRequest('/utilisateurs/', json('POST', body)),

    update: (id, body) =>
      apiRequest(`/utilisateurs/${id}/`, json('PATCH', body)),

    remove: (id) =>
      apiRequest(`/utilisateurs/${id}/`, { method: 'DELETE' }),
  },

  rapports: {
    list: () =>
      apiRequest('/rapports/'),

    create: (body) =>
      apiRequest('/rapports/', json('POST', body)),
  },

  roles: {
    list: () =>
      apiRequest('/roles/'),
  },

  habilitations: {
    list: () =>
      apiRequest('/habilitations/'),
  },

  preferences: {
    list: () =>
      apiRequest('/preferences/'),

    save: (body) =>
      apiRequest('/preferences/', json('POST', body)),
  },

  parametres: {
    list: () =>
      apiRequest('/parametres/'),

    save: (body) =>
      apiRequest('/parametres/', json('POST', body)),
  },
}
