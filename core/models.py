from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.contrib.auth.models import User
import os
import uuid
from django.core.files.storage import default_storage
from .utils import delete_file_from_gcs
from django.utils.text import slugify
from django.utils import timezone


def profile_picture_upload_to(instance, filename):
    ext = filename.split('.')[-1]
    filename = f'{instance.user.id}_profile_{uuid.uuid4()}.{ext}'
    return os.path.join('profile_pictures', filename)

def bank_qr_code_upload_to(instance, filename):
    ext = filename.split('.')[-1]
    filename = f'{instance.user.id}_bankqr_{uuid.uuid4()}.{ext}'
    return os.path.join('bank_qr_codes', filename)

def generate_unique_filename(instance, filename, prefix, bill_name):
    ext = filename.split('.')[-1]
    sanitized_bill_name = slugify(bill_name)[:30]
    return f'{prefix}/{sanitized_bill_name}_{instance.__class__.__name__.lower()}_{instance.pk or "new"}_{uuid.uuid4().hex[:8]}.{ext}'

def expense_photo_upload_to(instance, filename):
    return generate_unique_filename(instance, filename, 'expense_photos', instance.bill.name)

def note_image_upload_to(instance, filename):
    return generate_unique_filename(instance, filename, 'note_images', instance.bill.name)

def comment_image_upload_to(instance, filename):
    return generate_unique_filename(instance, filename, 'comment_images', instance.note.bill.name)

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
    photo = models.ImageField(upload_to=expense_photo_upload_to, blank=True, null=True)
    date = models.DateField(default=timezone.now)
    
    def __str__(self):
        return f'{self.description} - {self.amount}'
    
    def save(self, *args, **kwargs):
        if self.pk is None:
            temp_photo = self.photo
            self.photo = None
            super().save(*args, **kwargs)
            if temp_photo:
                new_name = generate_unique_filename(self, temp_photo.name, 'expense_photos', self.bill.name)
                self.photo.save(new_name, temp_photo, save=False)
                super().save(update_fields=['photo'])
                
                if temp_photo.name.startswith('temp_expense_photos/'):
                    default_storage.delete(temp_photo.name)
        else: 
            if self.photo:
                try:
                    old_instance = Expense.objects.get(pk=self.pk)
                    if old_instance.photo and old_instance.photo != self.photo:
                        delete_file_from_gcs(old_instance.photo.name)
                        new_name = generate_unique_filename(self, self.photo.name, 'expense_photos', self.bill.name)
                        self.photo.name = new_name
                except Expense.DoesNotExist:
                    pass
            
            super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.photo:
            delete_file_from_gcs(self.photo.name)
        super().delete(*args, **kwargs)

class ParticipantAmount(models.Model):
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='participantamount_set')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    profile_picture = models.ImageField(upload_to=profile_picture_upload_to, blank=True, null=True)
    bank_qr_code = models.ImageField(upload_to=bank_qr_code_upload_to, blank=True, null=True)
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

    registration_complete = models.BooleanField(default=False)

## Maybe remove profile_picture and bank_qr_code here

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    profile_picture = models.ImageField(upload_to=profile_picture_upload_to, blank=True, null=True)
    bank_account = models.CharField(max_length=50, blank=True, null=True)
    bank_qr_code = models.ImageField(upload_to=bank_qr_code_upload_to, blank=True, null=True)

    def __str__(self):
        return self.user.username

    def save(self, *args, **kwargs):
        try:
            this = UserProfile.objects.get(id=self.id)
            if this.profile_picture != self.profile_picture and this.profile_picture:
                this.profile_picture.delete(save=False)
            if this.bank_qr_code != self.bank_qr_code and this.bank_qr_code:
                this.bank_qr_code.delete(save=False)
        except UserProfile.DoesNotExist:
            pass
        super(UserProfile, self).save(*args, **kwargs)

class Friend(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friends', on_delete=models.CASCADE)
    friend = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'friend')

    def __str__(self):
        return f'User: {self.user.username} / Friend: {self.friend.username}'
    
class FriendRequest(models.Model):
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friend_requests_sent', on_delete=models.CASCADE)
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friend_requests_received', on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f'{self.from_user.username} to {self.to_user.username}'
    
class Note(models.Model):
    bill = models.ForeignKey('Bill', on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to=note_image_upload_to, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    formatted_created_at = models.CharField(max_length=20, blank=True)

    def save(self, *args, **kwargs):
        if not self.formatted_created_at:
            self.formatted_created_at = timezone.localtime(timezone.now()).strftime("%Y/%m/%d %H:%M")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Note by {self.author.username} for {self.bill.name}"
    
    def delete(self, *args, **kwargs):
        if self.image:
            delete_file_from_gcs(self.image.name)
        super().delete(*args, **kwargs)


class Comment(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to=comment_image_upload_to, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    formatted_created_at = models.CharField(max_length=20, blank=True)

    def save(self, *args, **kwargs):
        if not self.formatted_created_at:
            self.formatted_created_at = timezone.localtime(timezone.now()).strftime("%Y/%m/%d %H:%M")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.image:
            delete_file_from_gcs(self.image.name)
        super().delete(*args, **kwargs)

    