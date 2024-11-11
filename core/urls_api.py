from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'bills', views.BillViewSet)

urlpatterns = [
    path('', include(router.urls)),
]