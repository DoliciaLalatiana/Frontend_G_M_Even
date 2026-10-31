export const fluxSemaine = [
  { jour: 'Lun', sorties: 34, retours: 22 },
  { jour: 'Mar', sorties: 48, retours: 36 },
  { jour: 'Mer', sorties: 72, retours: 54 },
  { jour: 'Jeu', sorties: 64, retours: 48 },
  { jour: 'Ven', sorties: 92, retours: 66 },
  { jour: 'Sam', sorties: 80, retours: 74 },
  { jour: 'Dim', sorties: 42, retours: 58 },
]

export const evolutionMensuelle = [
  { mois: 'Mai', emprunts: 118, retours: 102, evenements: 9 },
  { mois: 'Juin', emprunts: 146, retours: 131, evenements: 12 },
  { mois: 'Juil', emprunts: 168, retours: 152, evenements: 14 },
  { mois: 'Août', emprunts: 132, retours: 126, evenements: 8 },
  { mois: 'Sept', emprunts: 174, retours: 158, evenements: 13 },
  { mois: 'Oct', emprunts: 196, retours: 171, evenements: 15 },
  { mois: 'Nov', emprunts: 164, retours: 149, evenements: 11 },
  { mois: 'Déc', emprunts: 138, retours: 122, evenements: 10 },
]

export const repartitionIncidents = [
  { nom: 'Chocs transport', valeur: 45, couleur: '#FF4B72' },
  { nom: 'Câbles défectueux', valeur: 30, couleur: '#FFB743' },
  { nom: 'Poussière / humidité', valeur: 15, couleur: '#42BDEB' },
  { nom: 'Défauts composants', valeur: 10, couleur: '#8054D8' },
]

export const rapportsInitiaux = [
  {
    id: 'rap-001',
    titre: 'Bilan mensuel du parc — Octobre 2026',
    type: 'Inventaire',
    format: 'PDF',
    date: '2026-10-31',
    taille: '2,4 Mo',
    auteur: 'Alexandre Mercier',
  },
  {
    id: 'rap-002',
    titre: 'Analyse des emprunts — Semaine 44',
    type: 'Emprunts',
    format: 'CSV',
    date: '2026-10-30',
    taille: '840 Ko',
    auteur: 'Thomas Laroche',
  },
  {
    id: 'rap-003',
    titre: 'Rapport SAV & matériel endommagé',
    type: 'Maintenance',
    format: 'PDF',
    date: '2026-10-27',
    taille: '1,8 Mo',
    auteur: 'Élodie Fontaine',
  },
  {
    id: 'rap-004',
    titre: 'Taux d’utilisation par catégorie — T4',
    type: 'Performance',
    format: 'XLSX',
    date: '2026-10-24',
    taille: '1,1 Mo',
    auteur: 'Céline Vasseur',
  },
  {
    id: 'rap-005',
    titre: 'Historique des retours — Septembre 2026',
    type: 'Retours',
    format: 'CSV',
    date: '2026-10-01',
    taille: '620 Ko',
    auteur: 'Tariq Benali',
  },
]

export const alertesStock = [
  {
    id: 'alert-001',
    niveau: 'critique',
    titre: 'Stock critique — Lyre Robe Spikie',
    message: '8 unités restantes sur 36. 3 réservations à venir consomment 12 unités.',
    materielId: 'mat-007',
  },
  {
    id: 'alert-002',
    niveau: 'attention',
    titre: 'Retours en retard',
    message: '2 bons dépassent la date de restitution prévue de plus de 48 h.',
    materielId: null,
  },
  {
    id: 'alert-003',
    niveau: 'info',
    titre: 'Contrôle optique requis',
    message: 'Robe MegaPointe : 4 luminaires à réviser avant Nuits Sonores.',
    materielId: 'mat-002',
  },
]
