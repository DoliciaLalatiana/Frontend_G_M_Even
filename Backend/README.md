# Backend — Gestion de matériel événementiel

API REST Django + Django REST Framework + PostgreSQL Neon, conçue à partir du schéma `core_*` déjà présent dans le projet Neon **Event Planner**.

## Garantie de préservation de la base existante

- Tous les modèles métier sont déclarés `managed = False` : Django les utilise, mais ne crée, ne modifie et ne supprime pas ces tables.
- Les identifiants `bigint IDENTITY BY DEFAULT` sont laissés à PostgreSQL.
- Aucun script SQL de création/suppression, aucune migration automatique, aucun `flush` et aucun chargement de données fictives n'est exécuté au démarrage.
- La commande `check_existing_schema` ne fait que lire la liste des tables.
- **Ne lance pas `migrate`, `flush` ou `seed_demo` sur Neon sans sauvegarde et vérification de l'historique de migrations.** La commande `seed_demo` de ce paquet est volontairement désactivée et ne modifie rien.

Cette application suppose que les tables et contraintes existantes correspondent bien aux exports fournis. Le contrôle de présence des tables ne remplace pas une comparaison exhaustive des colonnes sur la base distante.

## 1. Prérequis

- Python 3.11 ou 3.12
- PostgreSQL Neon existant
- Node.js si tu souhaites lancer le frontend React

## 2. Installation

Depuis le dossier `Backend/` :

Sous Windows, tu peux lancer `start_backend_windows.bat` après avoir configuré les fichiers `.env` et `../.env.local`. Le script installe les dépendances, effectue les contrôles non destructifs puis démarre le serveur.

```bash
python -m venv .venv
# Windows PowerShell : .venv\Scripts\Activate.ps1
# macOS / Linux : source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Copie `.env.example` en `.env` et renseigne une clé secrète Django longue et aléatoire. La configuration lit également `../.env.local`, emplacement indiqué dans la documentation du projet Neon.

Exemple `.env` (ne colle jamais tes vraies valeurs dans un dépôt Git ou dans une conversation) :

```dotenv
DJANGO_SECRET_KEY=une-cle-secrete-longue-et-aleatoire
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Dans le fichier privé `../.env.local`, ajoute l'URL fournie par Neon :

```dotenv
DATABASE_URL=postgresql://UTILISATEUR:MOT_DE_PASSE@HOTE/BASE?sslmode=require
```

Le fichier `.env.local` ne doit jamais être versionné. Si tu n'as pas encore le fichier généré par Neon, récupère la chaîne de connexion depuis le tableau de bord Neon et conserve-la localement.

## 3. Vérifier sans modifier la base

```bash
python manage.py check
python manage.py check_existing_schema
```

Ces commandes ne créent et ne modifient aucune table. `check_existing_schema` confirme la présence des tables métier attendues.

## 4. Créer le premier administrateur

Après avoir vérifié que `DATABASE_URL` pointe vers le bon projet Neon :

```bash
python manage.py bootstrap_admin --email ton.adresse@example.com --nom "Administrateur"
python manage.py changepassword ton.adresse@example.com
```

Le premier outil crée un compte sans mot de passe utilisable ; le second demande le mot de passe de façon interactive. Ne mets jamais un mot de passe dans la ligne de commande, un fichier de code ou un dépôt.

Pour les nouveaux utilisateurs créés par l'API, un mot de passe peut être fourni à la création par un administrateur. S'il est omis, le compte est créé avec un mot de passe inutilisable ; définis-le ensuite avec `changepassword`.

## 5. Lancer l'API

```bash
python manage.py runserver 127.0.0.1:8000
```

Vérifie `http://127.0.0.1:8000/api/health/`. Cette route confirme uniquement que le serveur répond ; elle ne renvoie aucune information de connexion.

## 6. Authentification

`POST /api/auth/token/`

```json
{"email":"ton.adresse@example.com","password":"ton-mot-de-passe"}
```

La réponse contient `access`, `refresh` et `user`. L'accès dure 15 minutes et le refresh 7 jours. Pour les routes protégées, ajoute :

```http
Authorization: Bearer ACCESS_TOKEN
```

Autres routes :

- `POST /api/auth/token/refresh/` — `{ "refresh": "..." }`
- `GET /api/auth/me/` — profil du compte connecté
- `POST /api/auth/password/` — `{ "mot_de_passe_actuel": "...", "nouveau_mot_de_passe": "..." }`

## 7. API disponible

Toutes les routes ci-dessous sont protégées par JWT, sauf `/api/health/` et l'obtention/renouvellement du jeton.

| Module | Routes | Particularités |
|---|---|---|
| Tableau de bord | `GET /api/dashboard/` | Totaux matériel, stock, emprunts, retards, réservations, utilisateurs |
| Catégories | `/api/categories/` | GET, POST, PUT, PATCH, DELETE ; suppression refusée si la catégorie contient du matériel |
| Matériels | `/api/materiels/` | GET, POST, PUT, PATCH, DELETE ; filtres `search`, `categorieId`, `etat` ; références uniques sans tenir compte de la casse |
| Événements | `/api/evenements/` | GET, POST, PUT, PATCH, DELETE ; filtres `search`, `statut`, `type` ; liens matériels via `materielIds` |
| Emprunts | `/api/emprunts/` | GET, POST, PUT, PATCH ; création atomique et décrément du stock |
| Retours | `/api/emprunts/{id}/retours/` | POST de retour partiel ou total, contrôle des quantités déjà restituées |
| Historique retours | `/api/retours/` | GET ; les retours ne sont pas supprimables |
| Réservations | `/api/reservations/` | GET, POST, PUT, PATCH ; action `POST /{id}/annuler/` |
| Utilisateurs | `/api/utilisateurs/` | GET ; écritures réservées à l'administrateur ; suppression remplacée par désactivation |
| Rôles | `/api/roles/` | GET ; écritures réservées à l'administrateur |
| Habilitations | `/api/habilitations/` | GET ; écritures réservées à l'administrateur |
| Rapports | `/api/rapports/` | GET, POST, PUT, PATCH ; historique protégé |
| Préférences | `/api/preferences/` | CRUD limité aux préférences du compte connecté |
| Paramètres | `/api/parametres/` | CRUD réservé à l'administrateur |

Les listes DRF sont paginées (`results`, `count`, `next`, `previous`), avec 100 résultats par page au maximum.

## 8. Règles métier prises en charge

- La quantité disponible ne peut pas être négative ni dépasser la quantité totale.
- La quantité totale ne peut pas être abaissée sous le volume encore emprunté.
- La création d'un emprunt et la diminution du stock sont exécutées dans une transaction atomique avec verrouillage des lignes de matériel.
- Un retour vérifie le reliquat de chaque ligne ; les retours partiels sont possibles.
- Seuls les matériels retournés en bon état réintègrent immédiatement le stock disponible. Un matériel endommagé est signalé en maintenance.
- Les références des emprunts, réservations et retours sont générées par le backend si elles ne sont pas fournies.
- Les historiques d'emprunts et de retours ne sont pas supprimables.
- Les catégories et matériels liés à des opérations ne sont pas supprimables.
- Les dates de fin d'événement/réservation doivent être postérieures ou égales aux dates de début.

## 9. Configuration du frontend

Le frontend fourni dans `Frontend/` est une application React/Vite qui utilisait initialement une authentification et des données de démonstration en `localStorage`. Le backend expose maintenant l'API et les formats JSON attendus (camelCase, identifiants chaîne), mais **le code frontend fourni n'a pas encore été basculé automatiquement sur les appels réseau**. Il faut remplacer les accès de démonstration de `AuthContext.jsx` et `DataContext.jsx` par les appels à ces endpoints avant d'utiliser l'application en production.

Origine API locale : `http://127.0.0.1:8000/api/`
Origine frontend Vite : `http://localhost:5173`

La variable CORS `CORS_ALLOWED_ORIGINS` doit contenir l'origine exacte du frontend déployé.

## 10. Limites et validation avant production

Le paquet a été généré à partir des fichiers frontend, de la spécification backend et des exports de colonnes, clés étrangères, clés primaires et contraintes uniques fournis. La connexion réelle à Neon n'a pas été testée depuis cet environnement et aucune donnée réelle n'a été lue ou modifiée.

Avant mise en production :
1. lancer `check` et `check_existing_schema` depuis un environnement ayant accès à Neon ;
2. comparer le résultat des colonnes de la base à `core/models.py` ;
3. tester les parcours CRUD et les retours avec un compte de test ;
4. faire une sauvegarde Neon avant toute évolution du schéma ;
5. connecter le frontend aux endpoints et supprimer le mode de démonstration ;
6. définir `DJANGO_DEBUG=False`, une vraie `DJANGO_SECRET_KEY`, `ALLOWED_HOSTS` et CORS pour le domaine déployé.

Aucun secret, mot de passe ou URL privée Neon n'est inclus dans ce paquet.
