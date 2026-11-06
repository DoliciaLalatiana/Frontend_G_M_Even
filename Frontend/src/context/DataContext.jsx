import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { parametresInitiaux } from '../data/parametres'
import { backendApi, tokenStore } from '../services/backendApi'
import { createId } from '../services/dataService'
import { getLignesRestantes, getStatutEmpruntCalcule } from '../services/stockService'
import { todayISO } from '../utils/format'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

const EMPTY_ARRAY = []

const defaultPreferences = {
  theme: parametresInitiaux?.preferences?.theme || 'dark',
  densite: parametresInitiaux?.preferences?.densite || 'confort',
  animations: parametresInitiaux?.preferences?.animations ?? true,
  raccourcis: parametresInitiaux?.preferences?.raccourcis ?? true,
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.results)) return payload.results
  return []
}

function normalizeParametres(settingsList) {
  const base = JSON.parse(JSON.stringify(parametresInitiaux || {}))
  const ids = {}
  for (const item of normalizeList(settingsList)) {
    if (item?.section && item.valeurs && typeof item.valeurs === 'object') {
      base[item.section] = { ...(base[item.section] || {}), ...item.valeurs }
      ids[item.section] = item.id
    }
  }
  base.__ids = ids
  return base
}

function normalizePreferences(prefsList) {
  const items = normalizeList(prefsList)
  const first = items[0]
  if (!first) return { ...defaultPreferences }
  return {
    id: first.id,
    theme: first.theme ?? defaultPreferences.theme,
    densite: first.densite ?? defaultPreferences.densite,
    animations: first.animations ?? defaultPreferences.animations,
    raccourcis: first.raccourcis ?? defaultPreferences.raccourcis,
  }
}

function ok(data = {}) {
  return { ok: true, ...data }
}

function fail(error, fallback = 'Une erreur est survenue.') {
  return { ok: false, message: error?.message || fallback }
}

export const DataProvider = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const [categories, setCategories] = useState(EMPTY_ARRAY)
  const [materiels, setMateriels] = useState(EMPTY_ARRAY)
  const [evenements, setEvenements] = useState(EMPTY_ARRAY)
  const [emprunts, setEmprunts] = useState(EMPTY_ARRAY)
  const [reservations, setReservations] = useState(EMPTY_ARRAY)
  const [retours, setRetours] = useState(EMPTY_ARRAY)
  const [utilisateurs, setUtilisateurs] = useState(EMPTY_ARRAY)
  const [rapports, setRapports] = useState(EMPTY_ARRAY)
  const [roles, setRoles] = useState(EMPTY_ARRAY)
  const [habilitations, setHabilitations] = useState(EMPTY_ARRAY)
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [parametres, setParametres] = useState(() => JSON.parse(JSON.stringify(parametresInitiaux || {})))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!tokenStore.access()) {
      setCategories(EMPTY_ARRAY)
      setMateriels(EMPTY_ARRAY)
      setEvenements(EMPTY_ARRAY)
      setEmprunts(EMPTY_ARRAY)
      setReservations(EMPTY_ARRAY)
      setRetours(EMPTY_ARRAY)
      setUtilisateurs(EMPTY_ARRAY)
      setRapports(EMPTY_ARRAY)
      setRoles(EMPTY_ARRAY)
      setHabilitations(EMPTY_ARRAY)
      setPreferences(defaultPreferences)
      setParametres(JSON.parse(JSON.stringify(parametresInitiaux || {})))
      return
    }

    if (!silent) setLoading(true)
    setError(null)

    const tasks = [
      ['categories', backendApi.categories.list, (v) => setCategories(normalizeList(v)), false],
      ['materiels', backendApi.materiels.list, (v) => setMateriels(normalizeList(v)), false],
      ['evenements', backendApi.evenements.list, (v) => setEvenements(normalizeList(v)), false],
      ['emprunts', backendApi.emprunts.list, (v) => setEmprunts(normalizeList(v)), false],
      ['reservations', backendApi.reservations.list, (v) => setReservations(normalizeList(v)), false],
      ['retours', backendApi.retours.list, (v) => setRetours(normalizeList(v)), false],
      ['utilisateurs', backendApi.utilisateurs.list, (v) => setUtilisateurs(normalizeList(v)), false],
      ['rapports', backendApi.rapports.list, (v) => setRapports(normalizeList(v)), false],
      ['roles', backendApi.roles.list, (v) => setRoles(normalizeList(v)), true],
      ['habilitations', backendApi.habilitations.list, (v) => setHabilitations(normalizeList(v)), true],
      ['preferences', backendApi.preferences.list, (v) => setPreferences(normalizePreferences(v)), true],
      ['parametres', backendApi.parametres.list, (v) => setParametres(normalizeParametres(v)), true],
    ]

    const results = await Promise.allSettled(tasks.map(([, fn]) => fn()))
    const failures = []
    results.forEach((result, index) => {
      const [name, , apply, optional] = tasks[index]
      if (result.status === 'fulfilled') apply(result.value)
      else if (!optional) failures.push(name)
    })

    if (failures.length) setError(`Chargement partiel: ${failures.join(', ')}.`)
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated || tokenStore.access()) loadAll()
    else loadAll({ silent: true })
  }, [authLoading, isAuthenticated, loadAll])

  const refreshAll = useCallback(() => loadAll({ silent: true }), [loadAll])

  // Catégories
  const addCategory = useCallback(async (payload) => {
    try {
      const created = await backendApi.categories.create(payload)
      setCategories((current) => [...current, created])
      return ok({ category: created, ...created })
    } catch (e) {
      return fail(e, "Impossible de créer la catégorie.")
    }
  }, [])

  const updateCategory = useCallback(async (id, payload) => {
    try {
      const updated = await backendApi.categories.update(id, payload)
      setCategories((current) => current.map((item) => (String(item.id) === String(id) ? updated : item)))
      return ok({ category: updated, ...updated })
    } catch (e) {
      return fail(e, "Impossible de modifier la catégorie.")
    }
  }, [])

  const deleteCategory = useCallback(async (id) => {
    try {
      await backendApi.categories.remove(id)
      setCategories((current) => current.filter((item) => String(item.id) !== String(id)))
      return ok()
    } catch (e) {
      return fail(e, "Impossible de supprimer la catégorie.")
    }
  }, [])

  // Alias compatibilité (Categories.jsx utilise la forme française)
  const addCategorie = addCategory
  const updateCategorie = updateCategory
  const deleteCategorie = deleteCategory

  // Matériels
  const addMateriel = useCallback(async (payload) => {
    try {
      const created = await backendApi.materiels.create(payload)
      setMateriels((current) => [...current, created])
      return ok({ materiel: created, ...created })
    } catch (e) {
      return fail(e, "Impossible d'ajouter le matériel.")
    }
  }, [])

  const updateMateriel = useCallback(async (id, payload) => {
    try {
      const updated = await backendApi.materiels.update(id, payload)
      setMateriels((current) => current.map((item) => (String(item.id) === String(id) ? updated : item)))
      return ok({ materiel: updated, ...updated })
    } catch (e) {
      return fail(e, "Impossible de modifier le matériel.")
    }
  }, [])

  const deleteMateriel = useCallback(async (id) => {
    try {
      await backendApi.materiels.remove(id)
      setMateriels((current) => current.filter((item) => String(item.id) !== String(id)))
      return ok()
    } catch (e) {
      return fail(e, "Impossible de supprimer le matériel.")
    }
  }, [])

  // Événements
  const addEvenement = useCallback(async (payload) => {
    try {
      const created = await backendApi.evenements.create(payload)
      setEvenements((current) => [...current, created])
      return ok({ evenement: created, ...created })
    } catch (e) {
      return fail(e, "Impossible de créer l'événement.")
    }
  }, [])

  const updateEvenement = useCallback(async (id, payload) => {
    try {
      const updated = await backendApi.evenements.update(id, payload)
      setEvenements((current) => current.map((item) => (String(item.id) === String(id) ? updated : item)))
      return ok({ evenement: updated, ...updated })
    } catch (e) {
      return fail(e, "Impossible de modifier l'événement.")
    }
  }, [])

  const deleteEvenement = useCallback(async (id) => {
    try {
      await backendApi.evenements.remove(id)
      setEvenements((current) => current.filter((item) => String(item.id) !== String(id)))
      return ok()
    } catch (e) {
      return fail(e, "Impossible de supprimer l'événement.")
    }
  }, [])

  // Emprunts
  const createEmprunt = useCallback(async (payload) => {
    try {
      const body = {
        emprunteurId: payload.emprunteurId,
        evenementId: payload.evenementId || null,
        dateEmprunt: payload.dateEmprunt,
        dateRetourPrevue: payload.dateRetourPrevue,
        notes: payload.notes || '',
        statut: payload.statut || 'En cours',
        lignes: (payload.lignes || []).map((l) => ({
          materielId: l.materielId,
          quantite: Number(l.quantite),
        })),
      }
      const created = await backendApi.emprunts.create(body)
      setEmprunts((current) => [created, ...current])
      try { setMateriels(normalizeList(await backendApi.materiels.list())) } catch {}
      return ok({ emprunt: created })
    } catch (e) {
      return fail(e, "Impossible de créer l'emprunt.")
    }
  }, [])

  const updateEmprunt = useCallback(async (id, payload) => {
    try {
      // Backend: les lignes d’un emprunt existant ne sont pas modifiables.
      const body = {
        emprunteurId: payload.emprunteurId,
        evenementId: payload.evenementId || null,
        dateEmprunt: payload.dateEmprunt,
        dateRetourPrevue: payload.dateRetourPrevue,
        notes: payload.notes ?? '',
        ...(payload.statut ? { statut: payload.statut } : {}),
        ...(payload.dateRetourReelle ? { dateRetourReelle: payload.dateRetourReelle } : {}),
      }
      const updated = await backendApi.emprunts.update(id, body)
      setEmprunts((current) => current.map((item) => (String(item.id) === String(id) ? updated : item)))
      return ok({ emprunt: updated })
    } catch (e) {
      return fail(e, "Impossible de modifier l'emprunt.")
    }
  }, [])

  // Retours (enregistrés via /emprunts/{id}/retours/)
  const processRetour = useCallback(async (payload) => {
    try {
      const result = await backendApi.emprunts.retour(payload.empruntId, {
        lignes: (payload.lignes || []).map((l) => ({
          materielId: l.materielId,
          quantite: Number(l.quantite),
          etat: l.etat || 'Bon état',
          commentaire: l.commentaire || '',
          dateRetour: l.dateRetour || todayISO(),
        })),
      })
      const [nextEmprunts, nextRetours, nextMateriels] = await Promise.all([
        backendApi.emprunts.list().catch(() => null),
        backendApi.retours.list().catch(() => null),
        backendApi.materiels.list().catch(() => null),
      ])
      if (nextEmprunts) setEmprunts(normalizeList(nextEmprunts))
      if (nextRetours) setRetours(normalizeList(nextRetours))
      if (nextMateriels) setMateriels(normalizeList(nextMateriels))
      return ok({ complete: result?.statut === 'Retourné', statut: result?.statut, retourIds: result?.retourIds || [] })
    } catch (e) {
      return fail(e, "Impossible d'enregistrer le retour.")
    }
  }, [])

  // Réservations
  const addReservation = useCallback(async (payload) => {
    try {
      const body = { ...payload }
      if (body.materielIds && !body.lignes) {
        body.lignes = body.materielIds.map((id) => ({ materielId: id, quantite: 1 }))
      }
      const created = await backendApi.reservations.create(body)
      setReservations((current) => [created, ...current])
      return ok({ reservation: created, ...created })
    } catch (e) {
      return fail(e, "Impossible de créer la réservation.")
    }
  }, [])

  const updateReservation = useCallback(async (id, payload) => {
    try {
      const body = { ...payload }
      if (body.materielIds && !body.lignes) {
        body.lignes = body.materielIds.map((mid) => ({ materielId: mid, quantite: 1 }))
      }
      const updated = await backendApi.reservations.update(id, body)
      setReservations((current) => current.map((item) => (String(item.id) === String(id) ? updated : item)))
      return ok({ reservation: updated, ...updated })
    } catch (e) {
      return fail(e, "Impossible de modifier la réservation.")
    }
  }, [])

  const cancelReservation = useCallback(async (id) => {
    try {
      const updated = await backendApi.reservations.annuler(id)
      setReservations((current) => current.map((item) => (String(item.id) === String(id) ? updated : item)))
      return ok({ reservation: updated, ...updated })
    } catch (e) {
      return fail(e, "Impossible d'annuler la réservation.")
    }
  }, [])

  const deleteReservation = useCallback(async (id) => {
    try {
      await backendApi.reservations.remove(id)
      setReservations((current) => current.filter((item) => String(item.id) !== String(id)))
      return ok()
    } catch (e) {
      return fail(e, "Les réservations sont conservées pour audit et ne peuvent pas être supprimées.")
    }
  }, [])

  // Utilisateurs
  const addUtilisateur = useCallback(async (payload) => {
    try {
      const created = await backendApi.utilisateurs.create(payload)
      setUtilisateurs((current) => [...current, created])
      return created
    } catch (e) {
      return { ok: false, message: e?.message || "Impossible de créer l'utilisateur." }
    }
  }, [])

  const updateUtilisateur = useCallback(async (id, payload) => {
    try {
      const updated = await backendApi.utilisateurs.update(id, payload)
      setUtilisateurs((current) => current.map((item) => (String(item.id) === String(id) ? updated : item)))
      return ok({ utilisateur: updated, ...updated })
    } catch (e) {
      return fail(e, "Impossible de modifier l'utilisateur.")
    }
  }, [])

  const deleteUtilisateur = useCallback(async (id) => {
    try {
      await backendApi.utilisateurs.remove(id)
      setUtilisateurs((current) => current.map((item) => (
        String(item.id) === String(id) ? { ...item, statut: 'Inactif', is_active: false } : item
      )))
      return ok()
    } catch (e) {
      return fail(e, "Impossible de supprimer l'utilisateur.")
    }
  }, [])

  // Rapports
  const addRapport = useCallback(async (payload) => {
    try {
      const body = {
        titre: payload.titre,
        type: payload.type || 'Général',
        format: payload.format || 'PDF',
        date: payload.date || todayISO(),
        taille_octets: payload.taille_octets ?? 0,
        auteurNom: payload.auteur || payload.auteurNom || 'Système',
      }
      const created = await backendApi.rapports.create(body)
      setRapports((current) => [created, ...current])
      return created
    } catch (e) {
      const local = { ...body, id: createId('rpt'), dateCreation: new Date().toISOString() }
      setRapports((current) => [local, ...current])
      return local
    }
  }, [])

  const deleteRapport = useCallback(async (id) => {
    try {
      await backendApi.rapports.remove(id)
      setRapports((current) => current.filter((item) => String(item.id) !== String(id)))
      return ok()
    } catch (e) {
      return fail(e, "Les rapports sont conservés dans l'historique.")
    }
  }, [])

  // Paramètres / préférences
  const updateParametres = useCallback(async (section, patch) => {
    let nextValues = {}
    setParametres((current) => {
      nextValues = { ...(current[section] || {}), ...patch }
      return { ...current, [section]: nextValues }
    })
    try {
      const existingId = parametres?.__ids?.[section]
      const valeurs = { ...(parametres?.[section] || {}), ...patch }
      if (existingId) await backendApi.parametres.update(existingId, { section, valeurs })
      else {
        const created = await backendApi.parametres.create({ section, valeurs })
        if (created?.id) setParametres((c) => ({ ...c, __ids: { ...(c.__ids || {}), [section]: created.id } }))
      }
    } catch {}
    return ok()
  }, [parametres])

  const updatePreferences = useCallback(async (patch) => {
    const next = { ...preferences, ...patch }
    setPreferences(next)
    try {
      if (preferences?.id) await backendApi.preferences.update(preferences.id, next)
      else {
        const created = await backendApi.preferences.create(next)
        if (created?.id) setPreferences((c) => ({ ...c, id: created.id }))
      }
    } catch {}
    return ok()
  }, [preferences])

  const resetDonnees = useCallback(async () => {
    await loadAll({ silent: true })
    return ok({ message: 'Données rechargées depuis le serveur.' })
  }, [loadAll])

  // Selecteurs compatibilité
  const findById = (list, id) => list.find((item) => String(item.id) === String(id))
  const getMateriel = useCallback((id) => findById(materiels, id), [materiels])
  const getUtilisateur = useCallback((id) => findById(utilisateurs, id), [utilisateurs])
  const getEvenement = useCallback((id) => findById(evenements, id), [evenements])
  const getCategorie = useCallback((id) => findById(categories, id), [categories])
  const getReservation = useCallback((id) => findById(reservations, id), [reservations])
  const getEmprunt = useCallback((id) => findById(emprunts, id), [emprunts])
  const getStatutEmprunt = useCallback((id) => {
    const e = findById(emprunts, id)
    return e ? getStatutEmpruntCalcule(e) : 'Inconnu'
  }, [emprunts])
  const getLignesRestantesEmprunt = useCallback((id) => {
    const e = findById(emprunts, id)
    return e ? getLignesRestantes(e, retours) : []
  }, [emprunts, retours])

  const value = useMemo(
    () => ({
      categories, materiels, evenements, emprunts, reservations, retours,
      utilisateurs, rapports, roles, habilitations, preferences, parametres,
      loading, error, refreshAll, loadAll,
      addCategory, updateCategory, deleteCategory,
      addMateriel, updateMateriel, deleteMateriel,
      addEvenement, updateEvenement, deleteEvenement,
      createEmprunt, updateEmprunt, processRetour,
      addReservation, updateReservation, cancelReservation, deleteReservation,
      addUtilisateur, updateUtilisateur, deleteUtilisateur,
      addRapport, deleteRapport,
      updateParametres, updatePreferences, resetDonnees,
      getMateriel, getUtilisateur, getEvenement, getCategorie, getReservation, getEmprunt,
      getStatutEmprunt, getLignesRestantesEmprunt,
    }),
    [
      categories, materiels, evenements, emprunts, reservations, retours,
      utilisateurs, rapports, roles, habilitations, preferences, parametres,
      loading, error, refreshAll, loadAll,
      addCategory, updateCategory, deleteCategory,
      addMateriel, updateMateriel, deleteMateriel,
      addEvenement, updateEvenement, deleteEvenement,
      createEmprunt, updateEmprunt, processRetour,
      addReservation, updateReservation, cancelReservation, deleteReservation,
      addUtilisateur, updateUtilisateur, deleteUtilisateur,
      addRapport, deleteRapport,
      updateParametres, updatePreferences, resetDonnees,
      getMateriel, getUtilisateur, getEvenement, getCategorie, getReservation, getEmprunt,
      getStatutEmprunt, getLignesRestantesEmprunt,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData doit être utilisé dans DataProvider')
  return context
}
