from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('login/', views.user_login, name='login'),
    path('register/', views.register, name='register'),
    path('logout/', views.user_logout, name='logout'),
    path('account_settings/', views.account_settings, name='account_settings'),
    path('create_bill/', views.create_bill, name='create_bill'),
    path('bill/<int:bill_id>/', views.bill_detail, name='bill_detail'),
    path('get_expense_data/<int:expense_id>/', views.get_expense_data, name='get_expense_data'),
    path('edit_expense/<int:expense_id>/', views.edit_expense, name='edit_expense'),
    path('delete_expense/<int:expense_id>/', views.delete_expense, name='delete_expense'),
    path('bill/<int:bill_id>/calculate_debts/', views.calculate_debts, name='calculate_debts'),
    path('delete_bill/<int:bill_id>/', views.delete_bill, name='delete_bill'),
    path('add_friend/', views.add_friend, name='add_friend'),
    path('get_friend_profile/<int:friend_id>/', views.get_friend_profile, name='get_friend_profile'),
    path('remove_friend/<int:friend_id>/', views.remove_friend, name='remove_friend'),
] 

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 