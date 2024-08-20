from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import CustomUser, Friend

class FriendInline(admin.TabularInline):
    model = Friend
    fk_name = "user"
    extra = 0

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    inlines = [FriendInline]

    list_display = ['username', 'email', 'is_staff', 'is_active', 'display_profile_picture', 'display_bank_qr_code', 'friends_list']
    search_fields = ['email', 'username']
    ordering = ['email']
    filter_horizontal = ()
    list_filter = ()
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('profile_picture', 'bank_qr_code')}),
    )

    def display_profile_picture(self, obj):
        if obj.profile_picture:
            return format_html('<img src="{}" width="50" height="50" style="object-fit: cover;" />', obj.profile_picture.url)
        return 'No Image'
    display_profile_picture.short_description = 'Profile Picture'

    def display_bank_qr_code(self, obj):
        if obj.bank_qr_code:
            return format_html('<img src="{}" width="50" height="50" style="object-fit: cover;" />', obj.bank_qr_code.url)
        return 'No QR Code'
    display_bank_qr_code.short_description = 'Bank QR Code'

    def friends_list(self, obj):
        return ", ".join([friend.friend.username for friend in obj.friends.all()])
    friends_list.short_description = 'Friends'