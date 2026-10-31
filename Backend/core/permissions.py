from rest_framework.permissions import BasePermission, SAFE_METHODS
class IsAdministrateur(BasePermission):
    message = 'Cette action est réservée à un administrateur.'
    def has_permission(self, request, view):
        user=request.user
        if not user or not user.is_authenticated: return False
        return bool(user.is_superuser or user.is_staff or (user.role and user.role.nom.lower() in {'administrateur','admin'}))
class ReadOnlyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.method in SAFE_METHODS or IsAdministrateur().has_permission(request,view))
