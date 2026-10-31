from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager, Group, Permission

# All business tables already exist in Neon. managed=False prevents Django from creating,
# altering or deleting them. PostgreSQL owns their IDENTITY BY DEFAULT columns.
class ExistingTable(models.Model):
    class Meta:
        abstract = True
        managed = False

class Role(ExistingTable):
    nom = models.CharField(max_length=80, unique=True)
    description = models.TextField()
    class Meta: db_table = 'core_role'; app_label = 'core'; managed = False
    def __str__(self): return self.nom

class Habilitation(ExistingTable):
    nom = models.CharField(max_length=80, unique=True)
    description = models.TextField()
    class Meta: db_table = 'core_habilitation'; app_label = 'core'; managed = False

class UserManager(BaseUserManager):
    use_in_migrations = False
    def _create_user(self, email, nom, password=None, **extra):
        if not email: raise ValueError('Une adresse e-mail est obligatoire.')
        extra.setdefault('telephone', '')
        extra.setdefault('statut', 'Actif')
        extra.setdefault('affectation', '')
        extra.setdefault('date_joined', timezone.now())
        user = self.model(email=self.normalize_email(email).lower(), nom=nom, **extra)
        if password: user.set_password(password)
        else: user.set_unusable_password()
        user.save(using=self._db)
        return user
    def create_user(self, email, nom, password=None, **extra):
        extra.setdefault('is_staff', False); extra.setdefault('is_superuser', False)
        return self._create_user(email, nom, password, **extra)
    def create_superuser(self, email, nom, password=None, **extra):
        extra.setdefault('is_staff', True); extra.setdefault('is_superuser', True); extra.setdefault('is_active', True)
        return self._create_user(email, nom, password, **extra)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(max_length=254, unique=True)
    nom = models.CharField(max_length=160)
    telephone = models.CharField(max_length=40)
    statut = models.CharField(max_length=16)
    affectation = models.CharField(max_length=180)
    date_entree = models.DateField(null=True, blank=True)
    signature_active = models.BooleanField(default=False)
    notifications_email = models.BooleanField(default=True)
    notifications_push = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    role = models.ForeignKey(Role, null=True, blank=True, on_delete=models.DO_NOTHING, db_column='role_id', related_name='utilisateurs')
    habilitations = models.ManyToManyField(Habilitation, blank=True, through='UserHabilitation', related_name='utilisateurs')
    groups = models.ManyToManyField(Group, blank=True, related_name='core_users', db_table='core_user_groups')
    user_permissions = models.ManyToManyField(Permission, blank=True, related_name='core_users', db_table='core_user_user_permissions')
    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom']
    class Meta: db_table = 'core_user'; app_label = 'core'; managed = False
    def __str__(self): return self.email

class UserHabilitation(ExistingTable):
    user = models.ForeignKey(User, on_delete=models.DO_NOTHING, db_column='user_id')
    habilitation = models.ForeignKey(Habilitation, on_delete=models.DO_NOTHING, db_column='habilitation_id')
    class Meta: db_table = 'core_user_habilitations'; app_label = 'core'; managed = False; unique_together = (('user','habilitation'),)

class Categorie(ExistingTable):
    nom = models.CharField(max_length=120)
    description = models.TextField()
    couleur = models.CharField(max_length=7)
    icone = models.CharField(max_length=60)
    responsable = models.CharField(max_length=160)
    maj = models.DateField()
    class Meta: db_table = 'core_categorie'; app_label = 'core'; managed = False

class Materiel(ExistingTable):
    nom = models.CharField(max_length=180)
    reference = models.CharField(max_length=80)
    marque = models.CharField(max_length=100)
    quantite_totale = models.IntegerField()
    quantite_disponible = models.IntegerField()
    etat = models.CharField(max_length=20)
    emplacement = models.CharField(max_length=180)
    valeur = models.DecimalField(max_digits=14, decimal_places=2)
    date_acquisition = models.DateField(null=True, blank=True)
    notes = models.TextField()
    categorie = models.ForeignKey(Categorie, on_delete=models.DO_NOTHING, db_column='categorie_id', related_name='materiels')
    class Meta: db_table = 'core_materiel'; app_label = 'core'; managed = False

class Evenement(ExistingTable):
    nom = models.CharField(max_length=180)
    type = models.CharField(max_length=60)
    date_debut = models.DateField()
    date_fin = models.DateField()
    lieu = models.CharField(max_length=220)
    responsable = models.CharField(max_length=160)
    statut = models.CharField(max_length=16)
    participants = models.IntegerField()
    description = models.TextField()
    responsable_utilisateur = models.ForeignKey(User, null=True, blank=True, on_delete=models.DO_NOTHING, db_column='responsable_utilisateur_id', related_name='evenements_responsable')
    materiels = models.ManyToManyField(Materiel, through='EvenementMateriel', related_name='evenements')
    class Meta: db_table = 'core_evenement'; app_label = 'core'; managed = False

class EvenementMateriel(ExistingTable):
    evenement = models.ForeignKey(Evenement, on_delete=models.DO_NOTHING, db_column='evenement_id')
    materiel = models.ForeignKey(Materiel, on_delete=models.DO_NOTHING, db_column='materiel_id')
    class Meta: db_table = 'core_evenementmateriel'; app_label = 'core'; managed = False; unique_together = (('evenement','materiel'),)

class Emprunt(ExistingTable):
    reference = models.CharField(max_length=40)
    date_emprunt = models.DateField()
    date_retour_prevue = models.DateField()
    date_retour_reelle = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=16)
    notes = models.TextField()
    date_creation = models.DateTimeField()
    date_maj = models.DateTimeField()
    emprunteur = models.ForeignKey(User, on_delete=models.DO_NOTHING, db_column='emprunteur_id', related_name='emprunts')
    evenement = models.ForeignKey(Evenement, null=True, blank=True, on_delete=models.DO_NOTHING, db_column='evenement_id', related_name='emprunts')
    class Meta: db_table = 'core_emprunt'; app_label = 'core'; managed = False

class LigneEmprunt(ExistingTable):
    quantite = models.IntegerField()
    emprunt = models.ForeignKey(Emprunt, on_delete=models.DO_NOTHING, db_column='emprunt_id', related_name='lignes')
    materiel = models.ForeignKey(Materiel, on_delete=models.DO_NOTHING, db_column='materiel_id', related_name='lignes_emprunt')
    class Meta: db_table = 'core_ligneemprunt'; app_label = 'core'; managed = False; unique_together = (('emprunt','materiel'),)

class Reservation(ExistingTable):
    reference = models.CharField(max_length=40)
    client = models.CharField(max_length=180)
    evenement_nom = models.CharField(max_length=180)
    date_debut = models.DateField()
    date_fin = models.DateField()
    lieu = models.CharField(max_length=220)
    statut = models.CharField(max_length=16)
    notes = models.TextField()
    date_creation = models.DateTimeField()
    date_maj = models.DateTimeField()
    evenement = models.ForeignKey(Evenement, null=True, blank=True, on_delete=models.DO_NOTHING, db_column='evenement_id', related_name='reservations')
    responsable = models.ForeignKey(User, null=True, blank=True, on_delete=models.DO_NOTHING, db_column='responsable_id', related_name='reservations')
    class Meta: db_table = 'core_reservation'; app_label = 'core'; managed = False

class LigneReservation(ExistingTable):
    quantite = models.IntegerField()
    materiel = models.ForeignKey(Materiel, on_delete=models.DO_NOTHING, db_column='materiel_id')
    reservation = models.ForeignKey(Reservation, on_delete=models.DO_NOTHING, db_column='reservation_id', related_name='lignes')
    class Meta: db_table = 'core_lignereservation'; app_label = 'core'; managed = False; unique_together = (('reservation','materiel'),)

class Retour(ExistingTable):
    reference = models.CharField(max_length=40)
    quantite = models.IntegerField()
    date_retour = models.DateField()
    etat = models.CharField(max_length=16)
    commentaire = models.TextField()
    inspecteur_nom = models.CharField(max_length=160)
    emprunt = models.ForeignKey(Emprunt, on_delete=models.DO_NOTHING, db_column='emprunt_id', related_name='retours')
    inspecteur = models.ForeignKey(User, null=True, blank=True, on_delete=models.DO_NOTHING, db_column='inspecteur_id', related_name='retours_inspectes')
    materiel = models.ForeignKey(Materiel, on_delete=models.DO_NOTHING, db_column='materiel_id', related_name='retours')
    class Meta: db_table = 'core_retour'; app_label = 'core'; managed = False

class Rapport(ExistingTable):
    titre = models.CharField(max_length=220)
    type = models.CharField(max_length=20)
    format = models.CharField(max_length=8)
    date = models.DateField()
    taille_octets = models.BigIntegerField(null=True, blank=True)
    auteur_nom = models.CharField(max_length=160)
    date_creation = models.DateTimeField()
    auteur = models.ForeignKey(User, null=True, blank=True, on_delete=models.DO_NOTHING, db_column='auteur_id')
    class Meta: db_table = 'core_rapport'; app_label = 'core'; managed = False

class UserPreference(ExistingTable):
    theme = models.CharField(max_length=30)
    densite = models.CharField(max_length=30)
    animations = models.BooleanField()
    raccourcis = models.BooleanField()
    utilisateur = models.OneToOneField(User, on_delete=models.DO_NOTHING, db_column='utilisateur_id', related_name='preference')
    class Meta: db_table = 'core_userpreference'; app_label = 'core'; managed = False

class SystemSetting(ExistingTable):
    section = models.CharField(max_length=80, unique=True)
    valeurs = models.JSONField()
    date_maj = models.DateTimeField()
    class Meta: db_table = 'core_systemsetting'; app_label = 'core'; managed = False
