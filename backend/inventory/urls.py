from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api import ProductViewSet, SaleViewSet
from .views import TurnoverAPI, ABCAnalysisAPI, SlowMoversAPI, SalesTrendsAPI, DashboardStatsAPI

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'sales', SaleViewSet)

# Analytics Patterns
analytics_patterns = [
    path('turnover/', TurnoverAPI.as_view(), name='analytics-turnover'),
    path('abc-analysis/', ABCAnalysisAPI.as_view(), name='analytics-abc'),
    path('slow-movers/', SlowMoversAPI.as_view(), name='analytics-slow-movers'),
    path('sales-trends/', SalesTrendsAPI.as_view(), name='analytics-sales-trends'),
    path('stats/', DashboardStatsAPI.as_view(), name='analytics-stats'), # Frontend asked for /inventory/stats/
    # The frontend called /inventory/stats/. I should map it there.
    # User Request said: "GET /api/inventory/stats/"
    # So I will add it to `urlpatterns` directly or inside analytics if routed via inventory.
]

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', DashboardStatsAPI.as_view(), name='inventory-stats'), # Mapping to match frontend
    path('analytics/', include(analytics_patterns)), # /api/inventory/analytics/...
]
