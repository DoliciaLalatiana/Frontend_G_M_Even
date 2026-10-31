from datetime import date
from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (Categorie, Materiel, Evenement, Emprunt, LigneEmprunt, Reservation,
    LigneReservation, Retour, User, Role, Habilitation, Rapport, UserPreference, SystemSetting)
from .serializers import (CategorySerializer, MaterielSerializer, EvenementSerializer,
    EmpruntSerializer, ReservationSerializer, RetourSerializer, UserSerializer,
    RoleSerializer, HabilitationSerializer, RapportSerializer, PreferenceSerializer,
    SystemSettingSerializer, make_reference)
from .permissions import IsAdministrateur, ReadOnlyOrAdmin

class HealthView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]
    def get(self,request): return Response({'status':'ok','service':'event-material-manager-api'})

class EmailTokenSerializer(TokenObtainPairSerializer):
    username_field='email'
    def validate(self,attrs):
        data=super().validate(attrs)
        if not self.user.is_active or self.user.statut.lower() not in {'actif','active'}:
            raise serializers.ValidationError('Ce compte est désactivé. Contactez un administrateur.')
        data['user']=UserSerializer(self.user).data
        return data
class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class=EmailTokenSerializer
    permission_classes=[AllowAny]
    authentication_classes=[]

class MeView(APIView):
    def get(self,request): return Response(UserSerializer(request.user).data)
class PasswordChangeView(APIView):
    def post(self,request):
        current=request.data.get('mot_de_passe_actuel',''); new=request.data.get('nouveau_mot_de_passe','')
        if not request.user.check_password(current): return Response({'mot_de_passe_actuel':['Mot de passe actuel incorrect.']},status=400)
        try:
            from django.contrib.auth.password_validation import validate_password
            validate_password(new,request.user)
        except Exception as exc: return Response({'nouveau_mot_de_passe':getattr(exc,'messages',[str(exc)])},status=400)
        request.user.set_password(new); request.user.save(update_fields=['password'])
        return Response({'detail':'Mot de passe modifié.'})

class BaseViewSet(viewsets.ModelViewSet):
    permission_classes=[IsAuthenticated]
    def perform_destroy(self,instance): instance.delete()

class CategoryViewSet(BaseViewSet):
    queryset=Categorie.objects.all().order_by('nom'); serializer_class=CategorySerializer
    search_fields=['nom','description','responsable']; ordering_fields=['nom','maj']
    def destroy(self,request,*args,**kwargs):
        obj=self.get_object()
        if obj.materiels.exists(): return Response({'detail':'Cette catégorie contient du matériel. Réaffectez-le avant suppression.'},status=409)
        return super().destroy(request,*args,**kwargs)

class MaterielViewSet(BaseViewSet):
    queryset=Materiel.objects.select_related('categorie').all().order_by('nom'); serializer_class=MaterielSerializer
    search_fields=['nom','reference','marque','emplacement']; ordering_fields=['nom','reference','quantite_disponible','valeur']
    def get_queryset(self):
        qs=super().get_queryset(); cat=self.request.query_params.get('categorieId'); etat=self.request.query_params.get('etat')
        if cat: qs=qs.filter(categorie_id=cat)
        if etat: qs=qs.filter(etat__iexact=etat)
        return qs
    def destroy(self,request,*args,**kwargs):
        obj=self.get_object()
        if LigneEmprunt.objects.filter(materiel=obj).exists() or Retour.objects.filter(materiel=obj).exists() or LigneReservation.objects.filter(materiel=obj).exists() or obj.evenements.exists():
            return Response({'detail':'Ce matériel possède un historique. Archivez-le ou modifiez son état au lieu de le supprimer.'},status=409)
        return super().destroy(request,*args,**kwargs)

class EvenementViewSet(BaseViewSet):
    queryset=Evenement.objects.all().order_by('-date_debut'); serializer_class=EvenementSerializer
    search_fields=['nom','lieu','responsable','type']; ordering_fields=['date_debut','date_fin','nom']
    def get_queryset(self):
        qs=super().get_queryset(); statut=self.request.query_params.get('statut'); typ=self.request.query_params.get('type')
        if statut: qs=qs.filter(statut__iexact=statut)
        if typ: qs=qs.filter(type__iexact=typ)
        return qs
    def destroy(self,request,*args,**kwargs):
        obj=self.get_object()
        if obj.emprunts.exclude(statut__in=['Retourné','Annulé','Annulée']).exists() or obj.reservations.exclude(statut__in=['Annulée','Annulee']).exists():
            return Response({'detail':'Cet événement possède des opérations actives. Annulez-les ou clôturez-les avant suppression.'},status=409)
        if obj.emprunts.exists() or obj.reservations.exists(): return Response({'detail':'Cet événement possède un historique. Il ne peut pas être supprimé.'},status=409)
        obj.materiels.clear(); return super().destroy(request,*args,**kwargs)

class EmpruntViewSet(BaseViewSet):
    queryset=Emprunt.objects.select_related('emprunteur','evenement').prefetch_related('lignes').all().order_by('-date_creation'); serializer_class=EmpruntSerializer
    search_fields=['reference','emprunteur__nom','notes']; ordering_fields=['date_emprunt','date_retour_prevue','date_creation']
    def get_queryset(self):
        qs=super().get_queryset(); statut=self.request.query_params.get('statut')
        if statut: qs=qs.filter(statut__iexact=statut)
        return qs
    def destroy(self,request,*args,**kwargs): return Response({'detail':'Un emprunt est un document historique et ne peut pas être supprimé.'},status=409)
    @action(detail=True,methods=['post'],url_path='retours')
    @transaction.atomic
    def enregistrer_retour(self,request,pk=None):
        emprunt=self.get_object(); items=request.data.get('lignes',[])
        if not items: return Response({'detail':'Ajoutez au moins une ligne de retour.'},status=400)
        returned=[]
        for item in items:
            mid=item.get('materielId'); qty=int(item.get('quantite',0)); state=item.get('etat','Bon état')
            if qty<=0: return Response({'detail':'La quantité doit être positive.'},status=400)
            line=LigneEmprunt.objects.select_for_update().filter(emprunt=emprunt,materiel_id=mid).first()
            if not line: return Response({'detail':'Ce matériel ne fait pas partie de cet emprunt.'},status=400)
            already=Retour.objects.filter(emprunt=emprunt,materiel_id=mid).aggregate(n=Sum('quantite'))['n'] or 0
            if qty>line.quantite-already: return Response({'detail':f'Quantité supérieure au restant à retourner ({line.quantite-already}).'},status=400)
            materiel=Materiel.objects.select_for_update().get(pk=mid)
            good=state.strip().lower() in {'bon état','bon etat','bon','complet'}
            if good:
                materiel.quantite_disponible += qty
                materiel.save(update_fields=['quantite_disponible'])
            else:
                materiel.etat='Maintenance' if state.lower().startswith('endom') else materiel.etat
                materiel.save(update_fields=['etat'])
            ret=Retour.objects.create(reference=make_reference('RET',Retour),quantite=qty,date_retour=item.get('dateRetour') or timezone.localdate(),etat=state,
                commentaire=item.get('commentaire',''),inspecteur_nom=request.user.nom,emprunt=emprunt,inspecteur=request.user,materiel=materiel)
            returned.append(str(ret.pk))
        totals=LigneEmprunt.objects.filter(emprunt=emprunt).aggregate(n=Sum('quantite'))['n'] or 0
        returned_total=Retour.objects.filter(emprunt=emprunt).aggregate(n=Sum('quantite'))['n'] or 0
        if returned_total>=totals:
            emprunt.statut='Retourné'; emprunt.date_retour_reelle=timezone.localdate()
        elif returned_total>0: emprunt.statut='Partiel'
        emprunt.date_maj=timezone.now(); emprunt.save(update_fields=['statut','date_retour_reelle','date_maj'])
        return Response({'detail':'Retour enregistré.','retourIds':returned,'statut':emprunt.statut},status=201)

class ReservationViewSet(BaseViewSet):
    queryset=Reservation.objects.select_related('evenement','responsable').prefetch_related('lignes').all().order_by('-date_creation'); serializer_class=ReservationSerializer
    search_fields=['reference','client','evenement_nom','lieu']; ordering_fields=['date_debut','date_fin','date_creation']
    def get_queryset(self):
        qs=super().get_queryset(); statut=self.request.query_params.get('statut')
        if statut: qs=qs.filter(statut__iexact=statut)
        return qs
    def destroy(self,request,*args,**kwargs):
        obj=self.get_object()
        if obj.statut.lower() not in {'annulée','annulee','terminée','terminee'}: return Response({'detail':'Annulez la réservation avant de la supprimer.'},status=409)
        return Response({'detail':'Les réservations sont conservées pour audit. Elles ne sont pas supprimables.'},status=409)
    @action(detail=True,methods=['post'])
    def annuler(self,request,pk=None):
        obj=self.get_object(); obj.statut='Annulée'; obj.date_maj=timezone.now(); obj.save(update_fields=['statut','date_maj'])
        return Response(self.get_serializer(obj).data)

class RetourViewSet(BaseViewSet):
    queryset=Retour.objects.select_related('emprunt','materiel','inspecteur').all().order_by('-date_retour'); serializer_class=RetourSerializer
    search_fields=['reference','inspecteur_nom','commentaire']; ordering_fields=['date_retour']
    def create(self,request,*args,**kwargs): return Response({'detail':'Les retours doivent être enregistrés depuis /api/emprunts/{id}/retours/ pour vérifier les quantités et le stock.'},status=405)
    def destroy(self,request,*args,**kwargs): return Response({'detail':'Un retour est une trace d’audit et ne peut pas être supprimé.'},status=409)

class UserViewSet(BaseViewSet):
    queryset=User.objects.select_related('role').all().order_by('nom'); serializer_class=UserSerializer
    permission_classes=[IsAuthenticated, ReadOnlyOrAdmin]
    search_fields=['nom','email','telephone','affectation']; ordering_fields=['nom','date_joined']
    def destroy(self,request,*args,**kwargs):
        obj=self.get_object()
        if obj.emprunts.exclude(statut='Retourné').exists(): return Response({'detail':'Cet utilisateur possède un emprunt actif.'},status=409)
        obj.is_active=False; obj.statut='Inactif'; obj.save(update_fields=['is_active','statut'])
        return Response(status=204)

class RapportViewSet(BaseViewSet):
    queryset=Rapport.objects.all().order_by('-date_creation'); serializer_class=RapportSerializer
    search_fields=['titre','type','auteur_nom']; ordering_fields=['date','date_creation']
    def perform_create(self,serializer): serializer.save(auteur=self.request.user,auteur_nom=self.request.user.nom,date_creation=timezone.now())
    def destroy(self,request,*args,**kwargs): return Response({'detail':'Les rapports sont conservés dans l’historique.'},status=409)
class RoleViewSet(BaseViewSet):
    queryset=Role.objects.all().order_by('nom'); serializer_class=RoleSerializer; permission_classes=[IsAuthenticated,ReadOnlyOrAdmin]; search_fields=['nom']
    def destroy(self,request,*args,**kwargs):
        obj=self.get_object()
        if obj.utilisateurs.exists(): return Response({'detail':'Ce rôle est attribué à des utilisateurs.'},status=409)
        return super().destroy(request,*args,**kwargs)
class HabilitationViewSet(BaseViewSet):
    queryset=Habilitation.objects.all().order_by('nom'); serializer_class=HabilitationSerializer; permission_classes=[IsAuthenticated,ReadOnlyOrAdmin]; search_fields=['nom']
    def destroy(self,request,*args,**kwargs):
        obj=self.get_object()
        if obj.utilisateurs.exists(): return Response({'detail':'Cette habilitation est attribuée à des utilisateurs.'},status=409)
        return super().destroy(request,*args,**kwargs)
class PreferenceViewSet(BaseViewSet):
    queryset=UserPreference.objects.all(); serializer_class=PreferenceSerializer
    def get_queryset(self): return super().get_queryset().filter(utilisateur=self.request.user)
    def perform_create(self,serializer): serializer.save(utilisateur=self.request.user)
    def perform_update(self,serializer): serializer.save(utilisateur=self.request.user)
class SystemSettingViewSet(BaseViewSet):
    queryset=SystemSetting.objects.all().order_by('section'); serializer_class=SystemSettingSerializer; permission_classes=[IsAuthenticated,IsAdministrateur]
    def perform_create(self,serializer): serializer.save(date_maj=timezone.now())
    def perform_update(self,serializer): serializer.save(date_maj=timezone.now())

class DashboardView(APIView):
    def get(self,request):
        total=Materiel.objects.aggregate(n=Sum('quantite_totale'))['n'] or 0
        available=Materiel.objects.aggregate(n=Sum('quantite_disponible'))['n'] or 0
        active_loans=Emprunt.objects.exclude(statut__in=['Retourné','Annulé','Annulée']).count()
        late=Emprunt.objects.filter(date_retour_prevue__lt=timezone.localdate()).exclude(statut='Retourné').count()
        return Response({'materielsTotal':Materiel.objects.count(),'quantiteTotale':total,'quantiteDisponible':available,
            'evenements':Evenement.objects.count(),'empruntsActifs':active_loans,'empruntsEnRetard':late,
            'reservationsActives':Reservation.objects.exclude(statut__in=['Annulée','Annulee']).count(),
            'retours':Retour.objects.count(),'categories':Categorie.objects.count(),'utilisateurs':User.objects.filter(is_active=True).count()})
