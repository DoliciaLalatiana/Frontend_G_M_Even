# Correspondance avec le schéma Neon vérifié

Les modèles Django pointent explicitement vers les tables suivantes, toutes déclarées `managed=False` :

| Modèle Django | Table PostgreSQL |
|---|---|
| `Categorie` | `core_categorie` |
| `Materiel` | `core_materiel` |
| `Evenement` | `core_evenement` |
| `EvenementMateriel` | `core_evenementmateriel` |
| `Emprunt` | `core_emprunt` |
| `LigneEmprunt` | `core_ligneemprunt` |
| `Reservation` | `core_reservation` |
| `LigneReservation` | `core_lignereservation` |
| `Retour` | `core_retour` |
| `User` | `core_user` |
| `Role` | `core_role` |
| `Habilitation` | `core_habilitation` |
| `UserHabilitation` | `core_user_habilitations` |
| `UserPreference` | `core_userpreference` |
| `Rapport` | `core_rapport` |
| `SystemSetting` | `core_systemsetting` |
| relation Django Groups | `core_user_groups` |
| relation Django Permissions | `core_user_user_permissions` |

Relations étrangères confirmées par l'export :

- `core_materiel.categorie_id` → `core_categorie.id`
- `core_emprunt.emprunteur_id` → `core_user.id`
- `core_emprunt.evenement_id` → `core_evenement.id`
- `core_ligneemprunt.emprunt_id` → `core_emprunt.id`
- `core_ligneemprunt.materiel_id` → `core_materiel.id`
- `core_reservation.evenement_id` → `core_evenement.id`
- `core_reservation.responsable_id` → `core_user.id`
- `core_lignereservation.reservation_id` → `core_reservation.id`
- `core_lignereservation.materiel_id` → `core_materiel.id`
- `core_retour.emprunt_id` → `core_emprunt.id`
- `core_retour.materiel_id` → `core_materiel.id`
- `core_retour.inspecteur_id` → `core_user.id`
- `core_evenement.responsable_utilisateur_id` → `core_user.id`
- `core_evenementmateriel.evenement_id` → `core_evenement.id`
- `core_evenementmateriel.materiel_id` → `core_materiel.id`
- `core_user.role_id` → `core_role.id`
- `core_user_habilitations.user_id` → `core_user.id`
- `core_user_habilitations.habilitation_id` → `core_habilitation.id`
- `core_userpreference.utilisateur_id` → `core_user.id`
- `core_rapport.auteur_id` → `core_user.id`

Les exports confirment des identifiants `bigint` avec `IDENTITY BY DEFAULT` et une séquence PostgreSQL associée pour chaque table `core_*` concernée. Les modèles utilisent donc le `BigAutoField` par défaut et laissent PostgreSQL attribuer les IDs.

Les contraintes uniques confirmées incluent les références d'emprunt/réservation/retour, l'e-mail utilisateur, les noms des rôles/habilitations/paramètres et les couples (événement, matériel), (emprunt, matériel), (réservation, matériel), (utilisateur, habilitation), etc.
