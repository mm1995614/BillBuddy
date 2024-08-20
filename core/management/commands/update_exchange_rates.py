from django.core.management.base import BaseCommand
from django.http import HttpRequest
from core.views import get_exchange_rates 

class Command(BaseCommand):
    help = 'Updates exchange rates'

    def handle(self, *args, **kwargs):
        request = HttpRequest()
        get_exchange_rates(request)
        self.stdout.write(self.style.SUCCESS('Successfully updated exchange rates'))