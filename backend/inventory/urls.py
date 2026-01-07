from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, SaleViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'sales', SaleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
