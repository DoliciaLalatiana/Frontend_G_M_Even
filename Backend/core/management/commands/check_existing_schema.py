from django.core.management.base import BaseCommand, CommandError
from django.db import connection

EXPECTED_COLUMNS = {'core_categorie': ['id', 'nom', 'description', 'couleur', 'icone', 'responsable', 'maj'],
 'core_emprunt': ['id',
                  'reference',
                  'date_emprunt',
                  'date_retour_prevue',
                  'date_retour_reelle',
                  'statut',
                  'notes',
                  'date_creation',
                  'date_maj',
                  'emprunteur_id',
                  'evenement_id'],
 'core_evenement': ['id',
                    'nom',
                    'type',
                    'date_debut',
                    'date_fin',
                    'lieu',
                    'responsable',
                    'statut',
                    'participants',
                    'description',
                    'responsable_utilisateur_id'],
 'core_evenementmateriel': ['id', 'evenement_id', 'materiel_id'],
 'core_habilitation': ['id', 'nom', 'description'],
 'core_ligneemprunt': ['id', 'quantite', 'emprunt_id', 'materiel_id'],
 'core_lignereservation': ['id', 'quantite', 'materiel_id', 'reservation_id'],
 'core_materiel': ['id',
                   'nom',
                   'reference',
                   'marque',
                   'quantite_totale',
                   'quantite_disponible',
                   'etat',
                   'emplacement',
                   'valeur',
                   'date_acquisition',
                   'notes',
                   'categorie_id'],
 'core_rapport': ['id',
                  'titre',
                  'type',
                  'format',
                  'date',
                  'taille_octets',
                  'auteur_nom',
                  'date_creation',
                  'auteur_id'],
 'core_reservation': ['id',
                      'reference',
                      'client',
                      'evenement_nom',
                      'date_debut',
                      'date_fin',
                      'lieu',
                      'statut',
                      'notes',
                      'date_creation',
                      'date_maj',
                      'evenement_id',
                      'responsable_id'],
 'core_retour': ['id',
                 'reference',
                 'quantite',
                 'date_retour',
                 'etat',
                 'commentaire',
                 'inspecteur_nom',
                 'emprunt_id',
                 'inspecteur_id',
                 'materiel_id'],
 'core_role': ['id', 'nom', 'description'],
 'core_systemsetting': ['id', 'section', 'valeurs', 'date_maj'],
 'core_user': ['id',
               'password',
               'last_login',
               'is_superuser',
               'email',
               'nom',
               'telephone',
               'statut',
               'affectation',
               'date_entree',
               'signature_active',
               'notifications_email',
               'notifications_push',
               'is_active',
               'is_staff',
               'date_joined',
               'role_id'],
 'core_user_groups': ['id', 'user_id', 'group_id'],
 'core_user_habilitations': ['id', 'user_id', 'habilitation_id'],
 'core_user_user_permissions': ['id', 'user_id', 'permission_id'],
 'core_userpreference': ['id', 'theme', 'densite', 'animations', 'raccourcis', 'utilisateur_id']}

class Command(BaseCommand):
    help = 'Vérifie en lecture seule les tables, colonnes, clés primaires et identifiants PostgreSQL existants.'
    def handle(self, *args, **opts):
        errors = []
        with connection.cursor() as cursor:
            tables = set(connection.introspection.table_names(cursor))
            for table, expected in EXPECTED_COLUMNS.items():
                if table not in tables:
                    errors.append(f'Table absente : {table}')
                    continue
                actual = {c.name for c in connection.introspection.get_table_description(cursor, table)}
                missing = sorted(set(expected) - actual)
                if missing: errors.append(f'{table} : colonnes absentes : {", ".join(missing)}')
                constraints = connection.introspection.get_constraints(cursor, table)
                if not any(c.get('primary_key') for c in constraints.values()): errors.append(f'{table} : clé primaire absente')
            if connection.vendor == 'postgresql':
                cursor.execute("SELECT table_name, is_identity FROM information_schema.columns WHERE table_schema = current_schema() AND column_name = 'id' AND table_name LIKE 'core_%'")
                identity = {row[0]: row[1] for row in cursor.fetchall()}
                for table in EXPECTED_COLUMNS:
                    if identity.get(table) != 'YES': errors.append(f'{table}.id : colonne identity attendue, résultat={identity.get(table)}')
        if errors:
            raise CommandError('Écarts détectés :\n- ' + '\n- '.join(errors))
        self.stdout.write(self.style.SUCCESS(f'Contrôle réussi : {len(EXPECTED_COLUMNS)} tables, colonnes attendues, clés primaires et IDENTITY vérifiés. Lecture seule ; aucune donnée ni structure modifiée.'))
