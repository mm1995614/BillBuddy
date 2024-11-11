from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from django.contrib import admin
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('billbuddy.urls')),
    path('', views.dashboard, name='dashboard'),
    path('login/', views.user_login, name='login'),
    path('register/', views.register_step1, name='register'),
    path('register/step2/', views.register_step2, name='register_step2'),
    path('logout/', views.user_logout, name='logout'),
    path('groups/', views.group_list, name='group_list'),
    path('account_settings/', views.account_settings, name='account_settings'),
    path('change_password_ajax/', views.change_password_ajax, name='change_password_ajax'),
    path('create_bill/', views.create_bill, name='create_bill'),
    path('bill/<int:bill_id>/', views.bill_detail, name='bill_detail'),
    path('bill/<int:bill_id>/add_expense/', views.add_expense, name='add_expense'),
    path('get_expense_data/<int:expense_id>/', views.get_expense_data, name='get_expense_data'),
    path('edit_expense/<int:expense_id>/', views.edit_expense, name='edit_expense'),
    path('delete_expense/<int:expense_id>/', views.delete_expense, name='delete_expense'),
    path('bill/<int:bill_id>/calculate_debts/', views.calculate_debts, name='calculate_debts'),
    path('get_exchange_rates/', views.get_exchange_rates, name='get_exchange_rates'),
    path('convert/', views.currency_conversion, name='currency_conversion'),
    path('delete_bill/<int:bill_id>/', views.delete_bill, name='delete_bill'),
    path('bill/<int:bill_id>/notebook/', views.notebook, name='notebook'),
    path('bill/<int:bill_id>/add_note/', views.add_note, name='add_note'),
    path('note/<int:note_id>/comment/', views.add_comment, name='add_comment'),
    path('note/<int:note_id>/delete/', views.delete_note, name='delete_note'),
    path('friend_list/', views.friend_list, name='friend_list'),
    path('add_friend/', views.add_friend, name='add_friend'),
    path('accept_friend_request/<int:request_id>/', views.accept_friend_request, name='accept_friend_request'),
    path('reject_friend_request/<int:request_id>/', views.reject_friend_request, name='reject_friend_request'),
    path('get_friend_profile/<int:friend_id>/', views.get_friend_profile, name='get_friend_profile'),
    path('remove_friend/<int:friend_id>/', views.remove_friend, name='remove_friend'),
] 

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    #urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 


