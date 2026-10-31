# Exemples rapides de requêtes API

## Créer un matériel

```http
POST /api/materiels/
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "nom": "Projecteur LED",
  "reference": "MAT-LED-001",
  "marque": "Exemple",
  "quantiteTotale": 12,
  "quantiteDisponible": 12,
  "etat": "Bon état",
  "emplacement": "Dépôt A",
  "valeur": "250000.00",
  "dateAcquisition": "2026-10-31",
  "notes": "",
  "categorieId": "1"
}
```

## Créer un événement

```http
POST /api/evenements/
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "nom": "Conférence annuelle",
  "type": "Conférence",
  "dateDebut": "2026-11-20",
  "dateFin": "2026-11-21",
  "lieu": "Antananarivo",
  "responsable": "Responsable événement",
  "responsableId": "1",
  "statut": "Planifié",
  "participants": 150,
  "description": "Événement de démonstration",
  "materielIds": ["1", "2"]
}
```

## Créer un emprunt

```http
POST /api/emprunts/
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "emprunteurId": "1",
  "evenementId": "1",
  "dateEmprunt": "2026-11-19",
  "dateRetourPrevue": "2026-11-22",
  "notes": "Sortie pour montage",
  "lignes": [
    {"materielId": "1", "quantite": 2},
    {"materielId": "2", "quantite": 1}
  ]
}
```

## Enregistrer un retour partiel ou total

```http
POST /api/emprunts/1/retours/
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "lignes": [
    {"materielId": "1", "quantite": 1, "etat": "Bon état", "commentaire": "Contrôlé"},
    {"materielId": "2", "quantite": 1, "etat": "Endommagé", "commentaire": "Connecteur à réparer"}
  ]
}
```

Les identifiants de cet exemple sont fictifs : utilise les IDs réellement renvoyés par l'API de ta base.
