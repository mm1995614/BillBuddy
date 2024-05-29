from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class CustomPasswordValidator:
    def validate(self, password, user=None):
        
        pass

    def get_help_text(self):
        return _("Your password must meet the custom requirements.")