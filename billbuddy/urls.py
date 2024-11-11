from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import BillBuddyViewSet  

router = DefaultRouter()
router.register(r'bills', BillBuddyViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('api/', include('core.urls_api')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    # urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)