from django.contrib import admin
from django.urls import path, include

from core.views import metrics_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/inventory/", include("inventory.urls")),
    path("api/forecasting/", include("forecasting.urls")),
    path("metrics/", metrics_view, name="prometheus-metrics"),
]
