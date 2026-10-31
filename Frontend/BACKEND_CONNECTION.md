# Connexion au backend Django

Un client réseau centralisé est disponible dans `src/services/backendApi.js`. Il gère l'envoi du JWT, le renouvellement du jeton d'accès, les erreurs HTTP et les principaux endpoints.

Configurer `VITE_API_URL=http://127.0.0.1:8000/api` dans un fichier `.env` local, puis redémarrer Vite.

**Important :** le frontend fourni utilise encore ses contextes de démonstration (`AuthContext.jsx` et `DataContext.jsx`). Le client `backendApi.js` est prêt pour leur remplacement, mais ces contextes ne sont pas encore migrés vers l'API. Ne considère donc pas le frontend comme connecté à Neon tant que les contextes et les formulaires ne sont pas basculés et testés. Ne supprime pas les données de démonstration avant d'avoir validé les données récupérées par l'API.

Le backend renvoie des identifiants de base sous forme de chaînes numériques. Les anciens identifiants de démonstration comme `mat-001` ou `usr-002` ne sont pas des identifiants Neon et ne doivent pas être envoyés à l'API.
