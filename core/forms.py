from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.conf import settings
from .models import CustomUser
from django.core.exceptions import ValidationError
import re
from django.contrib.auth.forms import AuthenticationForm
from .models import UserProfile, Bill, Expense
import json
from django.contrib.auth import get_user_model
from .models import Note, Comment

class BasicUserCreationForm(forms.ModelForm):
    email = forms.EmailField(required=True)
    username = forms.CharField(max_length=20, required=True)
    password1 = forms.CharField(label='Password', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Password confirmation', widget=forms.PasswordInput)


    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password1', 'password2')

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if len(username) > 20:
            raise ValidationError("Username cannot exceed 20 characters")
        if re.search(r'[\u4e00-\u9fff]', username) and len(username) > 10:
            raise ValidationError("Username cannot exceed 10 Chinese characters")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if CustomUser.objects.filter(email=email).exists():
            raise ValidationError("This email address is already in use")
        return email

    def clean_password1(self):
        password1 = self.cleaned_data.get('password1')
        if len(password1) < 8:
            raise ValidationError("Password must be at least 8 characters long")
        if not re.search(r'[A-Za-z]', password1) or not re.search(r'\d', password1):
            raise ValidationError("Password must contain both letters and numbers")
        return password1
    
    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get("password1")
        password2 = cleaned_data.get("password2")

        if password1 and password2 and password1 != password2:
            self.add_error('password2', "Passwords do not match")
            print("Passwords do not match")
            raise ValidationError("Passwords do not match")

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user

class ProfileCompletionForm(forms.ModelForm):
    profile_picture = forms.ImageField(required=True)
    bank_account = forms.CharField(max_length=50, required=False)
    bank_qr_code = forms.ImageField(required=False)
    profile_picture_data = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = UserProfile
        fields = ('profile_picture', 'bank_account', 'bank_qr_code', 'profile_picture_data')

    def clean_profile_picture(self):
        profile_picture = self.cleaned_data.get('profile_picture')
        if profile_picture:
            if profile_picture.size > 5 * 1024 * 1024:  # 5MB
                raise ValidationError("Profile picture size cannot exceed 5MB")
        return profile_picture

    def clean_bank_qr_code(self):
        bank_qr_code = self.cleaned_data.get('bank_qr_code')
        if bank_qr_code:
            if bank_qr_code.size > 5 * 1024 * 1024:  # 5MB
                raise ValidationError("QR code image size cannot exceed 5MB")
        return bank_qr_code

class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'profile_picture', 'bank_qr_code')

class EmailAuthenticationForm(AuthenticationForm):
    username = forms.EmailField(label='Email', max_length=254)

class UserForm(forms.ModelForm):
    class Meta:
        model = get_user_model()
        fields = ['username']

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ['profile_picture', 'bank_account', 'bank_qr_code']

class ExpenseForm(forms.ModelForm):
    split_type = forms.ChoiceField(choices=[('equal', 'Equal Split'), ('custom', 'Custom Split')], required=True)
    participants = forms.ModelMultipleChoiceField(queryset=CustomUser.objects.all(), required=False)
    participant_amounts = forms.CharField(widget=forms.HiddenInput(), required=False)
    photo = forms.ImageField(required=False)
    date = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}))

    class Meta:
        model = Expense
        fields = ['description', 'amount', 'paid_by', 'split_type', 'participants', 'participant_amounts', 'photo', 'date']

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
    
class NoteForm(forms.ModelForm):
    class Meta:
        model = Note
        fields = ['content', 'image']
        widgets = {
            'content': forms.Textarea(attrs={
                'rows': 4, 
                'cols': 50,
                'style': 'font-size: 16px; max-height: 150px;',
                'class': 'no-zoom-textarea'
            }),
        }

class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['content', 'image']
        widgets = {
            'content': forms.Textarea(attrs={
                'rows': 2, 
                'placeholder': 'Add a comment...',
                'style': 'font-size: 16px; max-height: 150px;',
                'class': 'no-zoom-textarea'
            }),
        }
    
    