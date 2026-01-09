from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api import ProductViewSet, SaleViewSet
from .views import (
    TurnoverAPI, 
    ABCAnalysisAPI, 
    SlowMoversAPI, 
    SalesTrendsAPI, 
    DashboardStatsAPI,
    InventoryHealthAPI,
    TopProductsAPI,
    ClearCacheAPI
)

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'sales', SaleViewSet)

# Analytics endpoints
analytics_patterns = [
    path('turnover/', TurnoverAPI.as_view(), name='analytics-turnover'),
    path('abc-analysis/', ABCAnalysisAPI.as_view(), name='analytics-abc'),
    path('slow-movers/', SlowMoversAPI.as_view(), name='analytics-slow-movers'),
    path('sales-trends/', SalesTrendsAPI.as_view(), name='analytics-sales-trends'),
    path('health/', InventoryHealthAPI.as_view(), name='analytics-health'),
    path('top-products/', TopProductsAPI.as_view(), name='analytics-top-products'),
    path('clear-cache/', ClearCacheAPI.as_view(), name='analytics-clear-cache'),
]

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', DashboardStatsAPI.as_view(), name='inventory-stats'),
    path('analytics/', include(analytics_patterns)),
]
