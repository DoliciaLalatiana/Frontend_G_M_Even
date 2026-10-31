from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from core.views import (HealthView, EmailTokenObtainPairView, MeView, PasswordChangeView,
    CategoryViewSet, MaterielViewSet, EvenementViewSet, EmpruntViewSet,
    ReservationViewSet, RetourViewSet, UserViewSet, RapportViewSet,
    RoleViewSet, HabilitationViewSet, PreferenceViewSet, SystemSettingViewSet, DashboardView)
router=DefaultRouter()
for prefix, view, basename in [
 ('categories',CategoryViewSet,'categorie'),('materiels',MaterielViewSet,'materiel'),('evenements',EvenementViewSet,'evenement'),
 ('emprunts',EmpruntViewSet,'emprunt'),('reservations',ReservationViewSet,'reservation'),('retours',RetourViewSet,'retour'),
 ('utilisateurs',UserViewSet,'utilisateur'),('rapports',RapportViewSet,'rapport'),('roles',RoleViewSet,'role'),
 ('habilitations',HabilitationViewSet,'habilitation'),('preferences',PreferenceViewSet,'preference'),('parametres',SystemSettingViewSet,'parametre')]:
    router.register(prefix,view,basename=basename)
urlpatterns=[path('api/health/',HealthView.as_view()),path('api/auth/token/',EmailTokenObtainPairView.as_view()),
 path('api/auth/token/refresh/',TokenRefreshView.as_view()),path('api/auth/me/',MeView.as_view()),
 path('api/auth/password/',PasswordChangeView.as_view()),path('api/dashboard/',DashboardView.as_view()),path('api/',include(router.urls))]
