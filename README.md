# Gestion de matériel événementiel

Ce dossier réunit le frontend React/Vite d'origine et le backend Django REST Framework construit pour s'appuyer sur le schéma Neon déjà existant.

- `Backend/` : API Django, JWT, modèles mappés sur `core_*`, commandes de contrôle en lecture seule et documentation.
- `Frontend/` : frontend React d'origine avec un client réseau préparatoire dans `src/services/backendApi.js`.

Commence par `Backend/README.md`. **Ne lance aucune migration ou commande d'initialisation de données sur Neon avant une sauvegarde et une validation de son historique de migrations.** Les modèles métier de ce backend sont `managed=False` pour éviter que Django gère le schéma existant.

Le client frontend réseau est fourni, mais les contextes React initiaux restent encore en mode démonstration `localStorage` : la migration complète de l'interface vers les appels API reste à réaliser et à tester avant production. Voir `Frontend/BACKEND_CONNECTION.md`.

Aucun secret Neon ni mot de passe n'est inclus.
