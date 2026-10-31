
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { empruntsInitiaux } from '../data/emprunts'
import { evenementsInitiaux } from '../data/evenements'
import { materielsInitiaux } from '../data/materiels'
import { parametresInitiaux } from '../data/parametres'
import { rapportsInitiaux } from '../data/rapports'
import { reservationsInitiales } from '../data/reservations'
import { retoursInitiaux } from '../data/retours'
import { utilisateursInitiaux } from '../data/utilisateurs'
import { usePersistentState } from '../hooks/usePersistentState'
import { backendApi } from '../services/backendApi'
import { createId } from '../services/dataService'
import {
  applyEmpruntToStock,
  applyRetourToStock,
  checkDisponibilitePeriode,
  getLignesRestantes,
  getStatutEmpruntCalcule,
  isEmpruntSolde,
  validateLignesEmprunt,
} from '../services/stockService'
import { daysUntil, nextReference, todayISO } from '../utils/format'

const DataContext = createContext(null)

const buildRetourReferences = (existingRetours, count) => {
  const latest = nextReference('RET', existingRetours)
  const year = new Date().getFullYear()
  const base = Number(latest.match(/(\d+)$/)?.[1] || 1)

  return Array.from(
    { length: count },
    (_, index) => `RET-${year}-${String(base + index).padStart(4, '0')}`,
  )
}

const extractCategories = (response) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.data)) return response.data
  return []
}

export const DataProvider = ({ children }) => {
  const [materiels, setMateriels, resetMateriels] = usePersistentState(
    'materiels',
    materielsInitiaux,
  )

  // Les catégories sont désormais chargées depuis l'API Django.
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState(null)

  const [evenements, setEvenements, resetEvenements] = usePersistentState(
    'evenements',
    evenementsInitiaux,
  )
  const [emprunts, setEmprunts, resetEmprunts] = usePersistentState(
    'emprunts',
    empruntsInitiaux,
  )
  const [retours, setRetours, resetRetours] = usePersistentState(
    'retours',
    retoursInitiaux,
  )
  const [reservations, setReservations, resetReservations] = usePersistentState(
    'reservations',
    reservationsInitiales,
  )
  const [utilisateurs, setUtilisateurs, resetUtilisateurs] = usePersistentState(
    'utilisateurs',
    utilisateursInitiaux,
  )
  const [rapports, setRapports, resetRapports] = usePersistentState(
    'rapports',
    rapportsInitiaux,
  )
  const [parametres, setParametres, resetParametres] = usePersistentState(
    'parametres',
    parametresInitiaux,
  )

  // Chargement initial des catégories depuis PostgreSQL.
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true)
    setCategoriesError(null)

    try {
      const response = await backendApi.categories.list()
      setCategories(extractCategories(response))
    } catch (error) {
      setCategoriesError(
        error?.message || 'Impossible de charger les catégories depuis le serveur.',
      )
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const addMateriel = useCallback(
    (payload) => {
      const materiel = { ...payload, id: createId('mat') }
      setMateriels((current) => [materiel, ...current])
      return materiel
    },
    [setMateriels],
  )

  const updateMateriel = useCallback(
    (id, payload) => {
      setMateriels((current) =>
        current.map((item) => (item.id === id ? { ...item, ...payload, id } : item)),
      )
    },
    [setMateriels],
  )

  const deleteMateriel = useCallback(
    (id) => {
      const actif = emprunts.some(
        (emprunt) =>
          emprunt.statut !== 'Retourné' &&
          emprunt.lignes.some((ligne) => ligne.materielId === id),
      )

      if (actif) {
        return {
          ok: false,
          message:
            'Ce matériel est engagé dans un emprunt actif. Enregistrez le retour avant suppression.',
        }
      }

      setMateriels((current) => current.filter((item) => item.id !== id))
      return { ok: true }
    },
    [emprunts, setMateriels],
  )

  // Création d'une catégorie dans PostgreSQL.
  const addCategorie = useCallback(async (payload) => {
    try {
      const categorie = await backendApi.categories.create(payload)

      setCategories((current) => [...current, categorie])

      return { ok: true, categorie }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'Impossible de créer cette catégorie.',
      }
    }
  }, [])

  // Modification d'une catégorie dans PostgreSQL.
  const updateCategorie = useCallback(async (id, payload) => {
    try {
      const categorie = await backendApi.categories.update(id, payload)

      setCategories((current) =>
        current.map((item) =>
          String(item.id) === String(id) ? categorie : item,
        ),
      )

      return { ok: true, categorie }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'Impossible de modifier cette catégorie.',
      }
    }
  }, [])

  // Suppression d'une catégorie dans PostgreSQL.
  const deleteCategorie = useCallback(
    async (id) => {
      const count = materiels.filter(
        (materiel) => String(materiel.categorieId) === String(id),
      ).length

      if (count > 0) {
        return {
          ok: false,
          message: `Cette catégorie contient ${count} référence(s). Réaffectez-les avant suppression.`,
        }
      }

      try {
        await backendApi.categories.remove(id)

        setCategories((current) =>
          current.filter((item) => String(item.id) !== String(id)),
        )

        return { ok: true }
      } catch (error) {
        return {
          ok: false,
          message: error?.message || 'Impossible de supprimer cette catégorie.',
        }
      }
    },
    [materiels],
  )

  const addEvenement = useCallback(
    (payload) => {
      const evenement = { ...payload, id: createId('evt') }
      setEvenements((current) => [evenement, ...current])
      return evenement
    },
    [setEvenements],
  )

  const updateEvenement = useCallback(
    (id, payload) => {
      setEvenements((current) =>
        current.map((item) => (item.id === id ? { ...item, ...payload, id } : item)),
      )
    },
    [setEvenements],
  )

  const deleteEvenement = useCallback(
    (id) => {
      const lie = emprunts.some(
        (emprunt) => emprunt.evenementId === id && emprunt.statut !== 'Retourné',
      )
      const reserve = reservations.some(
        (reservation) =>
          reservation.evenementId === id && reservation.statut !== 'Annulée',
      )

      if (lie || reserve) {
        return {
          ok: false,
          message:
            'Cet événement possède des emprunts actifs ou des réservations. Annulez-les avant suppression.',
        }
      }

      setEvenements((current) => current.filter((item) => item.id !== id))
      return { ok: true }
    },
    [emprunts, reservations, setEvenements],
  )

  const addUtilisateur = useCallback(
    (payload) => {
      const utilisateur = { ...payload, id: createId('usr') }
      setUtilisateurs((current) => [utilisateur, ...current])
      return utilisateur
    },
    [setUtilisateurs],
  )

  const updateUtilisateur = useCallback(
    (id, payload) => {
      setUtilisateurs((current) =>
        current.map((item) => (item.id === id ? { ...item, ...payload, id } : item)),
      )
    },
    [setUtilisateurs],
  )

  const deleteUtilisateur = useCallback(
    (id) => {
      const lie = emprunts.some(
        (emprunt) => emprunt.emprunteurId === id && emprunt.statut !== 'Retourné',
      )

      if (lie) {
        return {
          ok: false,
          message:
            'Cet utilisateur possède un emprunt en cours et ne peut pas être supprimé.',
        }
      }

      setUtilisateurs((current) => current.filter((item) => item.id !== id))
      return { ok: true }
    },
    [emprunts, setUtilisateurs],
  )

  const createEmprunt = useCallback(
    (payload) => {
      if (!payload.emprunteurId) {
        return { ok: false, message: 'Sélectionnez un emprunteur.' }
      }

      if (!payload.dateEmprunt || !payload.dateRetourPrevue) {
        return { ok: false, message: 'Renseignez les dates de sortie et de retour.' }
      }

      if (new Date(payload.dateRetourPrevue) < new Date(payload.dateEmprunt)) {
        return {
          ok: false,
          message: 'La date de retour doit suivre la date d’emprunt.',
        }
      }

      const validation = validateLignesEmprunt(payload.lignes, materiels)

      if (!validation.valid) {
        return {
          ok: false,
          message: validation.errors[0],
          errors: validation.errors,
        }
      }

      const emprunt = {
        ...payload,
        id: createId('emp'),
        reference: nextReference('EMP', emprunts),
        dateRetourReelle: null,
        statut: daysUntil(payload.dateRetourPrevue) < 0 ? 'En retard' : 'En cours',
      }

      setMateriels((current) => applyEmpruntToStock(current, payload.lignes))
      setEmprunts((current) => [emprunt, ...current])

      return { ok: true, emprunt }
    },
    [emprunts, materiels, setEmprunts, setMateriels],
  )

  const updateEmprunt = useCallback(
    (id, payload) => {
      const emprunt = emprunts.find((item) => item.id === id)

      if (!emprunt) {
        return { ok: false, message: 'Emprunt introuvable.' }
      }

      const stockRestitue = applyRetourToStock(materiels, emprunt.lignes)
      const validation = validateLignesEmprunt(payload.lignes, stockRestitue)

      if (!validation.valid) {
        return {
          ok: false,
          message: validation.errors[0],
          errors: validation.errors,
        }
      }

      setMateriels((current) => {
        const restored = applyRetourToStock(current, emprunt.lignes)
        return applyEmpruntToStock(restored, payload.lignes)
      })

      setEmprunts((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payload,
                id,
                statut: getStatutEmpruntCalcule({ ...item, ...payload }),
              }
            : item,
        ),
      )

      return { ok: true }
    },
    [emprunts, materiels, setEmprunts, setMateriels],
  )

  const processRetour = useCallback(
    ({ empruntId, lignes = [], inspecteur }) => {
      const emprunt = emprunts.find((item) => item.id === empruntId)

      if (!emprunt) {
        return { ok: false, message: 'Emprunt introuvable.' }
      }

      const restantes = getLignesRestantes(emprunt, retours)

      const valides = lignes
        .map((ligne) => {
          const restante = restantes.find(
            (item) => item.materielId === ligne.materielId,
          )

          if (!restante) return null

          const quantite = Math.min(
            Number(ligne.quantite) || 0,
            restante.quantiteRestante,
          )

          if (quantite <= 0) return null

          return {
            materielId: ligne.materielId,
            quantite,
            etat: ligne.etat || 'Bon état',
            commentaire: ligne.commentaire || '',
          }
        })
        .filter(Boolean)

      if (!valides.length) {
        return { ok: false, message: 'Aucune quantité valide à restituer.' }
      }

      const references = buildRetourReferences(retours, valides.length)

      const nouveauxRetours = valides.map((ligne, index) => ({
        id: createId('ret'),
        empruntId,
        reference: references[index],
        emprunteurId: emprunt.emprunteurId,
        materielId: ligne.materielId,
        quantite: ligne.quantite,
        dateRetour: todayISO(),
        etat: ligne.etat,
        commentaire: ligne.commentaire,
        inspecteur: inspecteur || 'Alexandre Mercier',
      }))

      const tousLesRetours = [...retours, ...nouveauxRetours]
      const complet = isEmpruntSolde(emprunt, tousLesRetours)

      setRetours((current) => [...nouveauxRetours, ...current])
      setMateriels((current) => applyRetourToStock(current, valides))

      setEmprunts((current) =>
        current.map((item) =>
          item.id === empruntId
            ? {
                ...item,
                statut: complet ? 'Retourné' : getStatutEmpruntCalcule(item),
                dateRetourReelle: complet ? todayISO() : item.dateRetourReelle,
              }
            : item,
        ),
      )

      return { ok: true, complete: complet, retours: nouveauxRetours }
    },
    [emprunts, retours, setEmprunts, setMateriels, setRetours],
  )

  const addReservation = useCallback(
    (payload) => {
      if (!payload.materielIds?.length) {
        return { ok: false, message: 'Sélectionnez au moins un matériel.' }
      }

      if (new Date(payload.dateFin) < new Date(payload.dateDebut)) {
        return {
          ok: false,
          message: 'La date de fin doit suivre la date de début.',
        }
      }

      const conflit = checkDisponibilitePeriode({
        materielIds: payload.materielIds,
        dateDebut: payload.dateDebut,
        dateFin: payload.dateFin,
        reservations,
        emprunts,
      })

      if (!conflit.disponible) {
        return {
          ok: false,
          message: `Conflit de disponibilité détecté (${conflit.totalConflits}). Choisissez une autre période.`,
        }
      }

      const reservation = {
        ...payload,
        id: createId('res'),
        reference: nextReference('RES', reservations),
        statut: payload.statut || 'En attente',
      }

      setReservations((current) => [reservation, ...current])

      return { ok: true, reservation }
    },
    [emprunts, reservations, setReservations],
  )

  const updateReservation = useCallback(
    (id, payload) => {
      if (!payload.materielIds?.length) {
        return { ok: false, message: 'Sélectionnez au moins un matériel.' }
      }

      const conflit = checkDisponibilitePeriode({
        materielIds: payload.materielIds,
        dateDebut: payload.dateDebut,
        dateFin: payload.dateFin,
        reservations,
        emprunts,
        excludeReservationId: id,
      })

      if (!conflit.disponible) {
        return {
          ok: false,
          message: `Conflit de disponibilité détecté (${conflit.totalConflits}). Choisissez une autre période.`,
        }
      }

      setReservations((current) =>
        current.map((item) => (item.id === id ? { ...item, ...payload, id } : item)),
      )

      return { ok: true }
    },
    [emprunts, reservations, setReservations],
  )

  const cancelReservation = useCallback(
    (id) => {
      setReservations((current) =>
        current.map((item) =>
          item.id === id ? { ...item, statut: 'Annulée' } : item,
        ),
      )

      return { ok: true }
    },
    [setReservations],
  )

  const deleteReservation = useCallback(
    (id) => {
      setReservations((current) => current.filter((item) => item.id !== id))
      return { ok: true }
    },
    [setReservations],
  )

  const addRapport = useCallback(
    (payload) => {
      const rapport = { ...payload, id: createId('rap') }
      setRapports((current) => [rapport, ...current])
      return rapport
    },
    [setRapports],
  )

  const deleteRapport = useCallback(
    (id) => {
      setRapports((current) => current.filter((item) => item.id !== id))
    },
    [setRapports],
  )

  const updateParametres = useCallback(
    (section, values) => {
      setParametres((current) => ({
        ...current,
        [section]: Array.isArray(values)
          ? values
          : typeof values === 'object' && values !== null
            ? { ...(current[section] || {}), ...values }
            : values,
      }))
    },
    [setParametres],
  )

  const resetDonnees = useCallback(() => {
    resetMateriels()
    resetEvenements()
    resetEmprunts()
    resetRetours()
    resetReservations()
    resetUtilisateurs()
    resetRapports()
    resetParametres()

    // Les catégories sont conservées dans PostgreSQL.
    loadCategories()
  }, [
    resetMateriels,
    resetEvenements,
    resetEmprunts,
    resetRetours,
    resetReservations,
    resetUtilisateurs,
    resetRapports,
    resetParametres,
    loadCategories,
  ])

  const value = useMemo(
    () => ({
      materiels,
      categories,
      categoriesLoading,
      categoriesError,
      loadCategories,
      evenements,
      emprunts,
      retours,
      reservations,
      utilisateurs,
      rapports,
      parametres,
      addMateriel,
      updateMateriel,
      deleteMateriel,
      addCategorie,
      updateCategorie,
      deleteCategorie,
      addEvenement,
      updateEvenement,
      deleteEvenement,
      addUtilisateur,
      updateUtilisateur,
      deleteUtilisateur,
      createEmprunt,
      updateEmprunt,
      processRetour,
      addReservation,
      updateReservation,
      cancelReservation,
      deleteReservation,
      addRapport,
      deleteRapport,
      updateParametres,
      resetDonnees,
    }),
    [
      materiels,
      categories,
      categoriesLoading,
      categoriesError,
      loadCategories,
      evenements,
      emprunts,
      retours,
      reservations,
      utilisateurs,
      rapports,
      parametres,
      addMateriel,
      updateMateriel,
      deleteMateriel,
      addCategorie,
      updateCategorie,
      deleteCategorie,
      addEvenement,
      updateEvenement,
      deleteEvenement,
      addUtilisateur,
      updateUtilisateur,
      deleteUtilisateur,
      createEmprunt,
      updateEmprunt,
      processRetour,
      addReservation,
      updateReservation,
      cancelReservation,
      deleteReservation,
      addRapport,
      deleteRapport,
      updateParametres,
      resetDonnees,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const context = useContext(DataContext)

  if (!context) {
    throw new Error('useData doit être utilisé dans DataProvider')
  }

  return context
}
