from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

class CaseInsensitiveEmailBackend(ModelBackend):
    """Authentifie par e-mail sans tenir compte de la casse."""
    def authenticate(self, request, username=None, password=None, **kwargs):
        email = kwargs.get('email') or username
        if not email or not password:
            return None
        User = get_user_model()
        try:
            user = User._default_manager.get(email__iexact=email.strip())
        except User.DoesNotExist:
            # Run a dummy hash to reduce timing differences for unknown addresses.
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
