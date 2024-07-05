from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.contrib.auth.models import User
import os

class Bill(models.Model):
    name = models.CharField(max_length=100)
    currency = models.CharField(max_length=10, default='GBP')
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='bills')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Expense(models.Model):
    SPLIT_TYPE_CHOICES = [
        ('equal', 'Equal Split'),
        ('custom', 'Custom Split'),
    ]
    bill = models.ForeignKey(Bill, related_name='expenses', on_delete=models.CASCADE)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='expenses_participated')
    split_type = models.CharField(max_length=10, choices=SPLIT_TYPE_CHOICES, default='equal')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.description} - {self.amount}'
    
class ParticipantAmount(models.Model):
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='participantamount_set')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    bank_qr_code = models.ImageField(upload_to='bank_qr_codes/', blank=True, null=True)
    groups = models.ManyToManyField(
        Group,
        related_name='customuser_set',
        blank=True,
        help_text=('The groups this user belongs to. A user will get all permissions '
                   'granted to each of their groups.'),
        verbose_name=('groups')
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name='customuser_set',
        blank=True,
        help_text=('Specific permissions for this user.'),
        verbose_name=('user permissions')
    )

    pass

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    profile_picture = models.ImageField(upload_to='profile_pics', blank=True, null=True)
    bank_account = models.CharField(max_length=50, blank=True, null=True)
    bank_qr_code = models.ImageField(upload_to='qr_codes', blank=True, null=True)

    def __str__(self):
        return self.user.username

    def save(self, *args, **kwargs):
        try:
            this = UserProfile.objects.get(id=self.id)
            if this.profile_picture != self.profile_picture and this.profile_picture:
                if os.path.isfile(this.profile_picture.path):
                    os.remove(this.profile_picture.path)
            if this.bank_qr_code != self.bank_qr_code and this.bank_qr_code:
                if os.path.isfile(this.bank_qr_code.path):
                    os.remove(this.bank_qr_code.path)
        except UserProfile.DoesNotExist:
            pass
        super(UserProfile, self).save(*args, **kwargs)

class Friend(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friends', on_delete=models.CASCADE)
    friend = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friend_of', on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'friend')

    def __str__(self):
        return f'User: {self.user.username} / Friend: {self.friend.username}'