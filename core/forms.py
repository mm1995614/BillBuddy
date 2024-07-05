from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.conf import settings
from .models import CustomUser
from django.core.exceptions import ValidationError
import re
from django.contrib.auth.forms import AuthenticationForm
from .models import UserProfile, Bill, Expense
import json


class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    username = forms.CharField(max_length=20, required=True)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password1', 'password2')

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if len(username) > 20:
            raise ValidationError("使用者名稱不能超過20個字元")
        if re.search(r'[\u4e00-\u9fff]', username) and len(username) > 10:
            raise ValidationError("使用者名稱不能超過10個中文字")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if CustomUser.objects.filter(email=email).exists():
            raise ValidationError("該電子郵件地址已被使用")
        return email

    def clean_password1(self):
        password1 = self.cleaned_data.get('password1')
        if len(password1) < 8:
            raise ValidationError("密碼長度必須至少8個字元")
        if not re.search(r'[A-Za-z]', password1) or not re.search(r'\d', password1):
            raise ValidationError("密碼必須包含字母和數字")
        return password1

    def save(self, commit=True):
        user = super(CustomUserCreationForm, self).save(commit=False)
        user.email = self.cleaned_data["email"]
        if commit:
            user.save()
        return user

class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'profile_picture', 'bank_qr_code')

class EmailAuthenticationForm(AuthenticationForm):
    username = forms.EmailField(label='Email', max_length=254)

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ['profile_picture', 'bank_account', 'bank_qr_code']

class BillForm(forms.ModelForm):
    class Meta:
        model = Bill
        fields = ['name', 'currency', 'members']
        widgets = {
            'members': forms.SelectMultiple(attrs={'class': 'select2'}),
            'currency': forms.Select(choices=[
                ('USD', 'USD'),
                ('EUR', 'EUR'),
                ('GBP', 'GBP'),
                ('TWD', 'TWD'),
                ('JPY', 'JPY'),
                ('CNY', 'CNY'),
                ('HKD', 'HKD'),
                ('MOP', 'MOP'),
                ('KRW', 'KRW'),
                ('VND', 'VND'),
                ('THB', 'THB'),
                ('SGD', 'SGD'),
                ('INR', 'INR'),
                ('MVR', 'MVR'),
                ('CHF', 'CHF'),
                ('SEK', 'SEK'),
                ('CAD', 'CAD'),
                ('MXN', 'MXN'),
                ('AUD', 'AUD'),
                ('NZD', 'NZD'),
                ('EGP', 'EGP'),
            ]),
        }

class ExpenseForm(forms.ModelForm):
    split_type = forms.ChoiceField(choices=[('equal', 'Equal Split'), ('custom', 'Custom Split')], required=True)
    participants = forms.ModelMultipleChoiceField(queryset=CustomUser.objects.all(), required=False)
    participant_amounts = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Expense
        fields = ['description', 'amount', 'paid_by', 'split_type', 'participants', 'participant_amounts']

    def __init__(self, *args, **kwargs):
        initial = kwargs.get('initial', {})
        expense = kwargs.get('instance')
        if expense:
            initial['split_type'] = 'custom' if expense.participantamount_set.exists() else 'equal'
            if expense.participantamount_set.exists():
                participant_data = {pa.user.id: str(pa.amount) for pa in expense.participantamount_set.all()}
                initial['participant_amounts'] = json.dumps(participant_data)
                initial['participants'] = expense.participantamount_set.values_list('user', flat=True)
        kwargs['initial'] = initial
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super().clean()
        split_type = cleaned_data.get("split_type")
        participants = cleaned_data.get("participants")
        participant_amounts = cleaned_data.get("participant_amounts")

        if split_type == 'custom' and not participants:
            self.add_error('participants', 'You must select participants for a custom split.')

        return cleaned_data
    

    
    