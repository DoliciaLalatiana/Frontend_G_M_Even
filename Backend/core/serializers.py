from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import (Categorie, Materiel, Evenement, EvenementMateriel, Emprunt, LigneEmprunt,
    Reservation, LigneReservation, Retour, User, Role, Habilitation, Rapport, UserPreference, SystemSetting)

class StringIdModelSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

class IdListField(serializers.Field):
    def get_attribute(self, instance):
        if hasattr(instance, 'materiels'): return instance.materiels
        return instance.lignes
    def to_representation(self, obj):
        if getattr(obj.model, '__name__', '') == 'LigneReservation': return [str(x) for x in obj.values_list('materiel_id', flat=True)]
        return [str(x) for x in obj.values_list('id', flat=True)]
    def to_internal_value(self, data):
        if not isinstance(data, list): raise serializers.ValidationError('Une liste est attendue.')
        return [str(x) for x in data]

class CategorySerializer(StringIdModelSerializer):
    maj = serializers.DateField(required=False)
    class Meta:
        model = Categorie
        fields = ('id','nom','description','couleur','icone','responsable','maj')
    def validate_nom(self, value):
        qs = Categorie.objects.filter(nom__iexact=value.strip())
        if self.instance: qs = qs.exclude(pk=self.instance.pk)
        if qs.exists(): raise serializers.ValidationError('Une catégorie porte déjà ce nom.')
        return value.strip()
    def create(self, validated_data): validated_data.setdefault('maj', timezone.localdate()); return super().create(validated_data)
    def update(self, instance, validated_data): validated_data['maj'] = timezone.localdate(); return super().update(instance, validated_data)

class MaterielSerializer(StringIdModelSerializer):
    categorieId = serializers.CharField(source='categorie_id')
    categorieNom = serializers.CharField(source='categorie.nom', read_only=True)
    quantiteTotale = serializers.IntegerField(source='quantite_totale')
    quantiteDisponible = serializers.IntegerField(source='quantite_disponible')
    dateAcquisition = serializers.DateField(source='date_acquisition', allow_null=True, required=False)
    class Meta:
        model = Materiel
        fields = ('id','nom','reference','marque','quantiteTotale','quantiteDisponible','etat','emplacement','valeur','dateAcquisition','notes','categorieId','categorieNom')
    def validate_reference(self, value):
        qs = Materiel.objects.filter(reference__iexact=value.strip())
        if self.instance: qs = qs.exclude(pk=self.instance.pk)
        if qs.exists(): raise serializers.ValidationError('Cette référence existe déjà.')
        return value.strip()
    def validate(self, attrs):
        total = attrs.get('quantite_totale', getattr(self.instance,'quantite_totale',0))
        available = attrs.get('quantite_disponible', getattr(self.instance,'quantite_disponible',0))
        if total < 0 or available < 0: raise serializers.ValidationError('Les quantités ne peuvent pas être négatives.')
        if available > total: raise serializers.ValidationError({'quantiteDisponible':'Le disponible ne peut pas dépasser le stock total.'})
        if self.instance and total < self.instance.quantite_totale - self.instance.quantite_disponible:
            raise serializers.ValidationError({'quantiteTotale':'Le stock total ne peut pas être inférieur aux quantités empruntées.'})
        return attrs

class EvenementSerializer(StringIdModelSerializer):
    dateDebut = serializers.DateField(source='date_debut')
    dateFin = serializers.DateField(source='date_fin')
    responsableId = serializers.CharField(source='responsable_utilisateur_id', allow_null=True, required=False)
    materielIds = IdListField(required=False)
    class Meta:
        model = Evenement
        fields = ('id','nom','type','dateDebut','dateFin','lieu','responsable','responsableId','statut','participants','description','materielIds')
    def validate(self, attrs):
        start = attrs.get('date_debut', getattr(self.instance,'date_debut',None)); end = attrs.get('date_fin',getattr(self.instance,'date_fin',None))
        if start and end and end < start: raise serializers.ValidationError({'dateFin':'La date de fin doit être égale ou postérieure à la date de début.'})
        return attrs
    @transaction.atomic
    def create(self, validated_data):
        ids = validated_data.pop('materielIds', [])
        obj = super().create(validated_data)
        obj.materiels.set(ids)
        return obj
    @transaction.atomic
    def update(self, instance, validated_data):
        ids = validated_data.pop('materielIds', None)
        obj = super().update(instance, validated_data)
        if ids is not None: obj.materiels.set(ids)
        return obj

class LineEmpruntSerializer(serializers.Serializer):
    materielId = serializers.CharField(source='materiel_id')
    quantite = serializers.IntegerField(min_value=1)

class EmpruntSerializer(StringIdModelSerializer):
    reference = serializers.CharField(required=False, allow_blank=True)
    statut = serializers.CharField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    emprunteurId = serializers.CharField(source='emprunteur_id')
    evenementId = serializers.CharField(source='evenement_id', allow_null=True, required=False)
    dateEmprunt = serializers.DateField(source='date_emprunt')
    dateRetourPrevue = serializers.DateField(source='date_retour_prevue')
    dateRetourReelle = serializers.DateField(source='date_retour_reelle', allow_null=True, required=False)
    lignes = LineEmpruntSerializer(many=True)
    emprunteurNom = serializers.CharField(source='emprunteur.nom', read_only=True)
    class Meta:
        model = Emprunt
        fields = ('id','reference','emprunteurId','emprunteurNom','evenementId','lignes','dateEmprunt','dateRetourPrevue','dateRetourReelle','statut','notes')
    def validate(self, attrs):
        lines = attrs.get('lignes', [])
        ids = [line['materiel_id'] for line in lines]
        if len(ids) != len(set(ids)): raise serializers.ValidationError({'lignes':'Un même matériel ne peut apparaître qu’une fois dans un emprunt.'})
        start = attrs.get('date_emprunt', getattr(self.instance,'date_emprunt',None)); end = attrs.get('date_retour_prevue',getattr(self.instance,'date_retour_prevue',None))
        if start and end and end < start: raise serializers.ValidationError({'dateRetourPrevue':'La date de retour doit suivre la date d’emprunt.'})
        return attrs
    @transaction.atomic
    def create(self, validated_data):
        lines = validated_data.pop('lignes'); now=timezone.now()
        if not validated_data.get('reference'): validated_data['reference'] = make_reference('EMP', Emprunt)
        validated_data.setdefault('statut','En cours'); validated_data.setdefault('notes',''); validated_data['date_creation']=now; validated_data['date_maj']=now
        obj = Emprunt.objects.create(**validated_data)
        for line in lines:
            m = Materiel.objects.select_for_update().get(pk=line['materiel_id'])
            q = line['quantite']
            if m.quantite_disponible < q: raise serializers.ValidationError(f'Stock insuffisant pour {m.nom} ({m.quantite_disponible} disponible(s)).')
            m.quantite_disponible -= q; m.save(update_fields=['quantite_disponible'])
            LigneEmprunt.objects.create(emprunt=obj,materiel=m,quantite=q)
        return obj
    @transaction.atomic
    def update(self, instance, validated_data):
        if 'lignes' in validated_data: raise serializers.ValidationError('Les lignes d’un emprunt existant ne sont pas modifiables. Enregistrez un retour ou créez un nouvel emprunt.')
        validated_data['date_maj']=timezone.now()
        return super().update(instance,validated_data)

class LineReservationSerializer(serializers.Serializer):
    materielId = serializers.CharField(source='materiel_id')
    quantite = serializers.IntegerField(min_value=1, required=False, default=1)

class ReservationSerializer(StringIdModelSerializer):
    reference = serializers.CharField(required=False, allow_blank=True)
    statut = serializers.CharField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    evenementId = serializers.CharField(source='evenement_id',allow_null=True,required=False)
    responsableId = serializers.CharField(source='responsable_id',allow_null=True,required=False)
    evenementNom = serializers.CharField(source='evenement_nom')
    dateDebut = serializers.DateField(source='date_debut')
    dateFin = serializers.DateField(source='date_fin')
    materielIds = IdListField(required=False)
    lignes = LineReservationSerializer(many=True,required=False,write_only=True)
    class Meta:
        model=Reservation
        fields=('id','reference','client','evenementNom','evenementId','materielIds','dateDebut','dateFin','lieu','responsableId','statut','notes','lignes')
    def validate(self,attrs):
        lines = attrs.get('lignes', [])
        ids = [line['materiel_id'] for line in lines]
        if len(ids) != len(set(ids)): raise serializers.ValidationError({'lignes':'Un même matériel ne peut apparaître qu’une fois dans une réservation.'})
        if len(attrs.get('materielIds', [])) != len(set(attrs.get('materielIds', []))): raise serializers.ValidationError({'materielIds':'La liste contient des doublons.'})
        a=attrs.get('date_debut',getattr(self.instance,'date_debut',None)); b=attrs.get('date_fin',getattr(self.instance,'date_fin',None))
        if a and b and b<a: raise serializers.ValidationError({'dateFin':'La date de fin doit être égale ou postérieure à la date de début.'})
        return attrs
    @transaction.atomic
    def create(self,validated_data):
        ids=validated_data.pop('materielIds',None); lines=validated_data.pop('lignes',[]); now=timezone.now()
        validated_data.setdefault('reference',make_reference('RES',Reservation)); validated_data.setdefault('statut','En attente'); validated_data.setdefault('notes',''); validated_data.update(date_creation=now,date_maj=now)
        obj=Reservation.objects.create(**validated_data)
        if lines:
            for line in lines: LigneReservation.objects.create(reservation=obj,materiel_id=line['materiel_id'],quantite=line['quantite'])
        elif ids:
            for mid in ids: LigneReservation.objects.create(reservation=obj,materiel_id=mid,quantite=1)
        return obj
    @transaction.atomic
    def update(self,instance,validated_data):
        ids=validated_data.pop('materielIds',None); lines=validated_data.pop('lignes',None); validated_data['date_maj']=timezone.now()
        obj=super().update(instance,validated_data)
        if ids is not None or lines is not None:
            obj.lignes.all().delete()
            for line in (lines if lines is not None else [{'materiel_id':x,'quantite':1} for x in ids]): LigneReservation.objects.create(reservation=obj,materiel_id=line['materiel_id'],quantite=line.get('quantite',1))
        return obj

class RetourSerializer(StringIdModelSerializer):
    empruntId=serializers.CharField(source='emprunt_id')
    materielId=serializers.CharField(source='materiel_id')
    inspecteurId=serializers.CharField(source='inspecteur_id',allow_null=True,required=False)
    dateRetour=serializers.DateField(source='date_retour')
    inspecteur=serializers.CharField(source='inspecteur_nom')
    emprunteurId=serializers.CharField(source='emprunt.emprunteur_id',read_only=True)
    class Meta:
        model=Retour
        fields=('id','reference','empruntId','emprunteurId','materielId','quantite','dateRetour','etat','commentaire','inspecteur','inspecteurId')

class HabilitationNamesField(serializers.Field):
    def get_attribute(self, instance): return instance.habilitations
    def to_representation(self, value): return list(value.values_list('nom', flat=True))
    def to_internal_value(self, data):
        if not isinstance(data, list): raise serializers.ValidationError('Une liste de noms est attendue.')
        return data

class UserSerializer(StringIdModelSerializer):
    roleId=serializers.CharField(source='role_id',allow_null=True,required=False)
    role=serializers.CharField(source='role.nom',read_only=True)
    dateEntree=serializers.DateField(source='date_entree',allow_null=True,required=False)
    habilitations=HabilitationNamesField(required=False)
    signatureActive=serializers.BooleanField(source='signature_active',required=False)
    notificationsEmail=serializers.BooleanField(source='notifications_email',required=False)
    notificationsPush=serializers.BooleanField(source='notifications_push',required=False)
    password=serializers.CharField(write_only=True,required=False,allow_blank=False)
    class Meta:
        model=User
        fields=('id','nom','email','telephone','role','roleId','statut','affectation','dateEntree','habilitations','signatureActive','notificationsEmail','notificationsPush','is_active','password')
    def validate_password(self,value):
        validate_password(value)
        return value
    def create(self,validated_data):
        password=validated_data.pop('password',None); habilitations=validated_data.pop('habilitations',[])
        if 'statut' in validated_data: validated_data['is_active'] = validated_data['statut'].lower() in {'actif','active'}
        user=User(**validated_data); user.set_password(password) if password else user.set_unusable_password(); user.save()
        if habilitations: user.habilitations.set(Habilitation.objects.filter(nom__in=habilitations))
        return user
    def update(self,instance,validated_data):
        password=validated_data.pop('password',None); habilitations=validated_data.pop('habilitations',None)
        if 'statut' in validated_data: validated_data['is_active'] = validated_data['statut'].lower() in {'actif','active'}
        for k,v in validated_data.items(): setattr(instance,k,v)
        if password: instance.set_password(password)
        instance.save()
        if habilitations is not None: instance.habilitations.set(Habilitation.objects.filter(nom__in=habilitations))
        return instance

class RoleSerializer(StringIdModelSerializer):
    class Meta: model=Role; fields=('id','nom','description')
class HabilitationSerializer(StringIdModelSerializer):
    class Meta: model=Habilitation; fields=('id','nom','description')
class RapportSerializer(StringIdModelSerializer):
    auteurId=serializers.CharField(source='auteur_id',allow_null=True,required=False,read_only=True)
    dateCreation=serializers.DateTimeField(source='date_creation',read_only=True)
    auteurNom=serializers.CharField(source='auteur_nom')
    class Meta: model=Rapport; fields=('id','titre','type','format','date','taille_octets','auteurNom','auteurId','dateCreation')
class PreferenceSerializer(StringIdModelSerializer):
    utilisateurId=serializers.CharField(source='utilisateur_id',read_only=True)
    class Meta: model=UserPreference; fields=('id','theme','densite','animations','raccourcis','utilisateurId')
class SystemSettingSerializer(StringIdModelSerializer):
    dateMaj=serializers.DateTimeField(source='date_maj',read_only=True)
    class Meta: model=SystemSetting; fields=('id','section','valeurs','dateMaj')

def make_reference(prefix, model):
    year=timezone.localdate().year
    latest=model.objects.filter(reference__startswith=f'{prefix}-{year}-').order_by('-reference').values_list('reference',flat=True).first()
    try: number=int(latest.rsplit('-',1)[-1])+1 if latest else 1
    except ValueError: number=1
    return f'{prefix}-{year}-{number:04d}'
