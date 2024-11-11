from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import BillViewSet  
from core.urls import api_urlpatterns, urlpatterns as core_urlpatterns

router = DefaultRouter()
router.register(r'bills', BillViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_urlpatterns)),  # API 路由
    path('', include(core_urlpatterns)),     # 原始 Django 路由
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    # urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)