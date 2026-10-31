import { daysUntil, isOverdue } from '../utils/format'

export const getMateriel = (materiels, id) => materiels.find((item) => item.id === id)

export const getCategorie = (categories, id) => categories.find((item) => item.id === id)

export const getUtilisateur = (utilisateurs, id) => utilisateurs.find((item) => item.id === id)

export const getEvenement = (evenements, id) => evenements.find((item) => item.id === id)

export const getMaterielNom = (materiels, id) => getMateriel(materiels, id)?.nom || 'Matériel inconnu'

export const getCategorieNom = (categories, id) => getCategorie(categories, id)?.nom || 'Sans catégorie'

export const getUtilisateurNom = (utilisateurs, id) =>
  getUtilisateur(utilisateurs, id)?.nom || 'Emprunteur inconnu'

export const getEvenementNom = (evenements, id) =>
  getEvenement(evenements, id)?.nom || 'Sans événement'

export const getMaterielsParCategorie = (materiels, categorieId) =>
  materiels.filter((materiel) => materiel.categorieId === categorieId)

export const computeCategoryStats = (materiels, categories) =>
  categories.map((categorie) => {
    const items = getMaterielsParCategorie(materiels, categorie.id)
    const total = items.reduce((sum, item) => sum + Number(item.quantiteTotale || 0), 0)
    const disponibles = items.reduce((sum, item) => sum + Number(item.quantiteDisponible || 0), 0)
    const valeur = items.reduce(
      (sum, item) => sum + Number(item.valeur || 0) * Number(item.quantiteTotale || 0),
      0,
    )
    return {
      ...categorie,
      nombreReferences: items.length,
      quantiteTotale: total,
      quantiteDisponible: disponibles,
      valeur,
      tauxDisponibilite: total > 0 ? Math.round((disponibles / total) * 100) : 0,
    }
  })

export const validateLignesEmprunt = (lignes = [], materiels = []) => {
  const errors = []
  const seen = new Set()

  if (!lignes.length) errors.push('Ajoutez au moins un matériel au bon de sortie.')

  lignes.forEach((ligne) => {
    const materiel = getMateriel(materiels, ligne.materielId)
    const quantite = Number(ligne.quantite)

    if (!materiel) {
      errors.push('Un matériel sélectionné est introuvable.')
      return
    }
    if (seen.has(ligne.materielId)) {
      errors.push(`Le matériel « ${materiel.nom} » est présent plusieurs fois.`)
    }
    seen.add(ligne.materielId)
    if (!Number.isFinite(quantite) || quantite <= 0) {
      errors.push(`La quantité demandée pour « ${materiel.nom} » est invalide.`)
      return
    }
    if (quantite > materiel.quantiteDisponible) {
      errors.push(
        `Stock insuffisant pour « ${materiel.nom} » : ${materiel.quantiteDisponible} disponible(s), ${quantite} demandé(s).`,
      )
    }
  })

  return { valid: errors.length === 0, errors }
}

export const applyEmpruntToStock = (materiels, lignes = []) =>
  materiels.map((materiel) => {
    const ligne = lignes.find((item) => item.materielId === materiel.id)
    if (!ligne) return materiel
    const quantite = Math.min(Number(ligne.quantite), materiel.quantiteDisponible)
    return { ...materiel, quantiteDisponible: materiel.quantiteDisponible - quantite }
  })

export const applyRetourToStock = (materiels, lignes = []) =>
  materiels.map((materiel) => {
    const ligne = lignes.find((item) => item.materielId === materiel.id)
    if (!ligne) return materiel

    const quantite = Math.max(0, Number(ligne.quantite) || 0)
    let etat = materiel.etat
    if (ligne.etat === 'Endommagé') etat = 'Endommagé'
    else if (ligne.etat === 'Incomplet' && etat === 'Bon état') etat = 'Incomplet'

    return {
      ...materiel,
      etat,
      quantiteDisponible: Math.min(materiel.quantiteTotale, materiel.quantiteDisponible + quantite),
    }
  })

export const getQuantitesRetournees = (emprunt, retours = []) => {
  const map = {}
  retours
    .filter((retour) => retour.empruntId === emprunt?.id)
    .forEach((retour) => {
      map[retour.materielId] = (map[retour.materielId] || 0) + Number(retour.quantite || 0)
    })
  return map
}

export const getLignesRestantes = (emprunt, retours = []) => {
  if (!emprunt) return []
  const retournees = getQuantitesRetournees(emprunt, retours)
  return emprunt.lignes
    .map((ligne) => ({
      ...ligne,
      quantiteRetournee: retournees[ligne.materielId] || 0,
      quantiteRestante: Math.max(0, ligne.quantite - (retournees[ligne.materielId] || 0)),
    }))
    .filter((ligne) => ligne.quantiteRestante > 0)
}

export const isEmpruntSolde = (emprunt, retours = []) => getLignesRestantes(emprunt, retours).length === 0

export const getStatutEmpruntCalcule = (emprunt) => {
  if (emprunt.statut === 'Retourné' || emprunt.dateRetourReelle) return 'Retourné'
  if (emprunt.statut === 'En retard') return 'En retard'
  if (isOverdue(emprunt.dateRetourPrevue, emprunt.dateRetourReelle, emprunt.statut)) return 'En retard'
  return emprunt.statut
}

export const getEmpruntsActifs = (emprunts = []) =>
  emprunts.filter((emprunt) => emprunt.statut !== 'Retourné')

export const getEmpruntsEnRetard = (emprunts = []) =>
  emprunts.filter((emprunt) => getStatutEmpruntCalcule(emprunt) === 'En retard')

export const getRetoursEnAttente = (emprunts = []) =>
  getEmpruntsActifs(emprunts).sort(
    (a, b) => new Date(a.dateRetourPrevue) - new Date(b.dateRetourPrevue),
  )

export const computeEmpruntResume = (emprunt, materiels = []) => {
  const lignes = emprunt?.lignes || []
  return {
    references: lignes.length,
    quantite: lignes.reduce((sum, ligne) => sum + Number(ligne.quantite || 0), 0),
    noms: lignes
      .map((ligne) => getMateriel(materiels, ligne.materielId)?.nom || 'Matériel')
      .join(', '),
  }
}

export const computeDashboardStats = ({
  materiels = [],
  emprunts = [],
  evenements = [],
  reservations = [],
  categories = [],
}) => {
  const total = materiels.reduce((sum, item) => sum + Number(item.quantiteTotale || 0), 0)
  const disponibles = materiels.reduce(
    (sum, item) => sum + Number(item.quantiteDisponible || 0),
    0,
  )
  const endommages = materiels
    .filter((item) => item.etat !== 'Bon état')
    .reduce((sum, item) => sum + (item.quantiteTotale - item.quantiteDisponible), 0)
  const empruntes = Math.max(0, total - disponibles - endommages)
  const evenementsAVenir = evenements.filter(
    (evenement) =>
      evenement.statut !== 'Terminé' &&
      evenement.statut !== 'Annulé' &&
      daysUntil(evenement.dateDebut) >= 0,
  ).length
  const empruntsActifs = getEmpruntsActifs(emprunts)
  const retards = getEmpruntsEnRetard(emprunts)
  const reservationsAVenir = reservations.filter(
    (reservation) =>
      reservation.statut !== 'Annulée' && daysUntil(reservation.dateFin) >= 0,
  )
  const valeurParc = materiels.reduce(
    (sum, item) => sum + Number(item.valeur || 0) * Number(item.quantiteTotale || 0),
    0,
  )
  const categoriesStats = computeCategoryStats(materiels, categories)
  const totalUnitesCategories = categoriesStats.reduce(
    (sum, item) => sum + item.quantiteTotale,
    0,
  )

  return {
    total,
    disponibles,
    empruntes,
    endommages,
    tauxDisponibilite: total ? Math.round((disponibles / total) * 100) : 0,
    tauxEmprunt: total ? Math.round((empruntes / total) * 100) : 0,
    tauxEndommagement: total ? Math.round((endommages / total) * 100) : 0,
    evenementsAVenir,
    empruntsActifs: empruntsActifs.length,
    retards: retards.length,
    retoursEnAttente: empruntsActifs.length,
    reservationsAVenir: reservationsAVenir.length,
    valeurParc,
    referencesMateriels: materiels.length,
    categoriesStats,
    repartitionCategories: categoriesStats
      .map((categorie) => ({
        nom: categorie.nom,
        valeur: categorie.quantiteTotale,
        quantite: categorie.quantiteTotale,
        couleur: categorie.couleur,
        pourcentage: totalUnitesCategories
          ? Math.round((categorie.quantiteTotale / totalUnitesCategories) * 100)
          : 0,
      }))
      .filter((categorie) => categorie.valeur > 0),
  }
}

export const getTopMateriels = (materiels = [], emprunts = [], limit = 5) => {
  const counts = {}

  emprunts.forEach((emprunt) => {
    emprunt.lignes.forEach((ligne) => {
      counts[ligne.materielId] = (counts[ligne.materielId] || 0) + Number(ligne.quantite || 0)
    })
  })

  return materiels
    .map((materiel) => {
      const sorties = counts[materiel.id] || 0
      const capacite = Math.max(materiel.quantiteTotale, 1)
      return {
        ...materiel,
        sorties,
        tauxUtilisation: Math.min(100, Math.round((sorties / capacite) * 100)),
      }
    })
    .sort((a, b) => b.sorties - a.sorties)
    .slice(0, limit)
}

export const getMaterielsEndommages = (materiels = []) =>
  materiels.filter((materiel) => ['Endommagé', 'Incomplet'].includes(materiel.etat))

export const getMaterielsEnMaintenance = (materiels = []) =>
  materiels.filter((materiel) => materiel.etat === 'Maintenance')

export const getStockFaible = (materiels = [], seuil = 25) =>
  materiels
    .filter(
      (materiel) =>
        materiel.quantiteTotale > 0 &&
        (materiel.quantiteDisponible / materiel.quantiteTotale) * 100 <= seuil,
    )
    .sort(
      (a, b) =>
        a.quantiteDisponible / a.quantiteTotale - b.quantiteDisponible / b.quantiteTotale,
    )

export const computeRapportStats = ({
  materiaux = [],
  emprunts = [],
  retours = [],
  evenements = [],
  utilisateurs = [],
  categories = [],
}) => {
  const totalSorties = emprunts.reduce(
    (sum, emprunt) =>
      sum + emprunt.lignes.reduce((lineSum, ligne) => lineSum + Number(ligne.quantite || 0), 0),
    0,
  )
  const totalRetours = retours.reduce((sum, retour) => sum + Number(retour.quantite || 0), 0)
  const retoursConformes = retours.filter((retour) => retour.etat === 'Bon état').length
  const tauxConformite = retours.length
    ? Math.round((retoursConformes / retours.length) * 100)
    : 100
  const topMateriels = getTopMateriels(materiaux, emprunts, 5)
  const usageCategories = categories
    .map((categorie) => {
      const items = materiaux.filter((materiel) => materiel.categorieId === categorie.id)
      const unites = items.reduce((sum, item) => sum + item.quantiteTotale, 0)
      const sorties = emprunts.reduce(
        (sum, emprunt) =>
          sum +
          emprunt.lignes
            .filter((ligne) => items.some((item) => item.id === ligne.materielId))
            .reduce((lineSum, ligne) => lineSum + Number(ligne.quantite || 0), 0),
        0,
      )
      return {
        ...categorie,
        unites,
        sorties,
        taux: unites ? Math.min(100, Math.round((sorties / unites) * 100)) : 0,
      }
    })
    .sort((a, b) => b.taux - a.taux)
  const endommages = getMaterielsEndommages(materiaux)
  const evenementsActifs = evenements.filter((evenement) => evenement.statut !== 'Annulé')

  return {
    totalSorties,
    totalRetours,
    tauxConformite,
    topMateriels,
    usageCategories,
    endommages,
    evenementsActifs,
    empruntsActifs: getEmpruntsActifs(emprunts).length,
    utilisateursActifs: utilisateurs.filter((utilisateur) => utilisateur.statut === 'Actif').length,
    valeurParc: materiaux.reduce(
      (sum, item) => sum + Number(item.valeur || 0) * Number(item.quantiteTotale || 0),
      0,
    ),
  }
}

export const rangesOverlap = (startA, endA, startB, endB) => {
  if (!startA || !endA || !startB || !endB) return false
  return new Date(startA) <= new Date(endB) && new Date(startB) <= new Date(endA)
}

export const findReservationConflicts = ({
  materielIds = [],
  dateDebut,
  dateFin,
  reservations = [],
  excludeId = null,
}) =>
  reservations.filter((reservation) => {
    if (reservation.id === excludeId) return false
    if (reservation.statut === 'Annulée') return false
    if (!rangesOverlap(dateDebut, dateFin, reservation.dateDebut, reservation.dateFin)) return false
    return reservation.materielIds.some((id) => materielIds.includes(id))
  })

export const findEmpruntConflicts = ({
  materielIds = [],
  dateDebut,
  dateFin,
  emprunts = [],
}) =>
  emprunts.filter((emprunt) => {
    if (emprunt.statut === 'Retourné') return false
    const fin = emprunt.dateRetourReelle || emprunt.dateRetourPrevue
    if (!rangesOverlap(dateDebut, dateFin, emprunt.dateEmprunt, fin)) return false
    return emprunt.lignes.some((ligne) => materielIds.includes(ligne.materielId))
  })

export const checkDisponibilitePeriode = ({
  materielIds = [],
  dateDebut,
  dateFin,
  reservations = [],
  emprunts = [],
  excludeReservationId = null,
}) => {
  const conflitsReservations = findReservationConflicts({
    materielIds,
    dateDebut,
    dateFin,
    reservations,
    excludeId: excludeReservationId,
  })
  const conflitsEmprunts = findEmpruntConflicts({ materielIds, dateDebut, dateFin, emprunts })

  return {
    disponible: conflitsReservations.length === 0 && conflitsEmprunts.length === 0,
    reservations: conflitsReservations,
    emprunts: conflitsEmprunts,
    totalConflits: conflitsReservations.length + conflitsEmprunts.length,
  }
}

export const getProchainesReservations = (reservations = [], limit = 3) =>
  reservations
    .filter(
      (reservation) =>
        reservation.statut !== 'Annulée' && daysUntil(reservation.dateFin) >= 0,
    )
    .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))
    .slice(0, limit)

export const getAlertesOperationnelles = ({ materiels = [], emprunts = [], seuil = 25 }) => {
  const alertes = []

  getStockFaible(materiels, seuil).forEach((materiel) => {
    alertes.push({
      id: `stock-${materiel.id}`,
      niveau: 'critique',
      titre: `Stock faible — ${materiel.nom}`,
      message: `${materiel.quantiteDisponible} unité(s) disponible(s) sur ${materiel.quantiteTotale}.`,
      lien: '/materiels',
    })
  })

  getEmpruntsEnRetard(emprunts).forEach((emprunt) => {
    alertes.push({
      id: `retard-${emprunt.id}`,
      niveau: 'danger',
      titre: `Retour en retard — ${emprunt.reference}`,
      message: `Restitution prévue le ${emprunt.dateRetourPrevue}. Relance recommandée.`,
      lien: '/retours',
    })
  })

  return alertes
}
