from django.core.management.base import BaseCommand
class Command(BaseCommand):
    help='Commande volontairement non destructive : aucune donnée fictive n’est insérée en base.'
    def handle(self,*args,**opts):
        self.stdout.write(self.style.WARNING('Import de démonstration désactivé pour protéger les données Neon existantes.'))
        self.stdout.write('Créez un administrateur avec bootstrap_admin, puis saisissez vos données depuis le frontend.')
