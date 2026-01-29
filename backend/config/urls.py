from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include

from core.views import metrics_view


def health_check(request):
    """Simple health check endpoint for orchestration/load balancers."""
    return JsonResponse({"status": "healthy"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/inventory/", include("inventory.urls")),
    path("api/forecasting/", include("forecasting.urls")),
    path("metrics/", metrics_view, name="prometheus-metrics"),
    path("health/", health_check, name="health-check"),
]
