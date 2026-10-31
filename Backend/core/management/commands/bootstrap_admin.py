from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from core.models import User, Role

class Command(BaseCommand):
    help = 'Crée le premier compte administrateur sans définir de mot de passe.'
    def add_arguments(self, parser):
        parser.add_argument('--email', required=True)
        parser.add_argument('--nom', required=True)
    def handle(self, *args, **opts):
        email=opts['email'].strip().lower()
        if User.objects.filter(email__iexact=email).exists(): raise CommandError('Un compte utilise déjà cette adresse e-mail.')
        role,_=Role.objects.get_or_create(nom='Administrateur',defaults={'description':'Accès complet à l’administration.'})
        user=User(email=email,nom=opts['nom'],telephone='',statut='Actif',affectation='Administration',
            date_entree=timezone.localdate(),signature_active=False,notifications_email=True,notifications_push=False,
            is_active=True,is_staff=True,is_superuser=True,role=role,date_joined=timezone.now())
        user.set_unusable_password(); user.save()
        self.stdout.write(self.style.SUCCESS(f'Administrateur créé : {email}'))
        self.stdout.write('Définissez le mot de passe de manière interactive : python manage.py changepassword '+email)
