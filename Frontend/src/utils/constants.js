export const APP_NAME = 'EVENT MANAGER'
export const APP_VERSION = 'v2.4.1'
export const STORAGE_PREFIX = 'eventmanager:'

export const ETATS_MATERIEL = ['Bon état', 'Endommagé', 'Maintenance', 'Incomplet']

export const STATUTS_EMPRUNT = ['En cours', 'Prolongé', 'En retard', 'Retourné']

export const STATUTS_EVENEMENT = ['Planifié', 'En cours', 'Terminé', 'Annulé']

export const STATUTS_RESERVATION = ['Confirmée', 'En attente', 'Annulée']

export const STATUTS_UTILISATEUR = ['Actif', 'Inactif', 'Suspendu']

export const ROLES_UTILISATEUR = [
  'Administrateur',
  'Régisseur',
  'Technicien',
  'Magasinier',
  'Prestataire',
]

export const TYPES_EVENEMENT = [
  'Festival',
  'Concert',
  'Salon',
  'Gala',
  'Exposition',
  'Entreprise',
  'Privé',
]

export const ETATS_RETOUR = ['Bon état', 'Endommagé', 'Incomplet']

export const HABILITATIONS = [
  'Inventaire',
  'Validation',
  'Départ matériel',
  'Retour matériel',
  'Maintenance',
  'Administration',
  'RH',
]

export const TONE_MAP = {
  success: ['bon état', 'disponible', 'actif', 'confirmée', 'retourné', 'terminé', 'conforme', 'en ligne', 'prêt'],
  cyan: ['en cours', 'planifié', 'réservé', 'réservation', 'prolongé', 'expédition', 'sortie'],
  warning: ['en attente', 'incomplet', 'maintenance', 'attention', 'option', 'contrôle', 'inspection'],
  danger: ['en retard', 'endommagé', 'annulé', 'suspendu', 'critique', 'rupture', 'inactif', 'sav', 'manquant'],
  violet: ['administrateur', 'admin', 'régisseur', 'prestataire', 'magasinier', 'technicien'],
}

export const PAGE_SIZE = 6

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
  { to: '/materiels', label: 'Matériels', icon: 'inventory' },
  { to: '/categories', label: 'Catégories', icon: 'layers' },
  { to: '/evenements', label: 'Événements', icon: 'calendar' },
  { to: '/emprunts', label: 'Emprunts', icon: 'northEast' },
  { to: '/retours', label: 'Retours', icon: 'southWest' },
  { to: '/reservations', label: 'Réservations', icon: 'bookmark' },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: 'users', adminOnly: true },
  { to: '/rapports', label: 'Rapports & Stats', icon: 'chart', adminOnly: true },
  { to: '/parametres', label: 'Paramètres', icon: 'settings' },
]

export const STATUT_TONE = (statut = '') => {
  const value = String(statut).toLowerCase()
  for (const [tone, keywords] of Object.entries(TONE_MAP)) {
    if (keywords.some((keyword) => value.includes(keyword))) return tone
  }
  return 'neutral'
}
