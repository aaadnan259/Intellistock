from django.urls import path
from .views import AdvancedForecastAPI, BatchForecastAPI, BatchStatusAPI
from .api_explainability import forecast_explanation
from .api_drift import drift_status
from .api_scenario import scenario_compare

urlpatterns = [
    path("advanced-predict/", AdvancedForecastAPI.as_view(), name="advanced_predict"),
    path("batch-predict/", BatchForecastAPI.as_view(), name="batch_predict"),
    path("batch-status/<str:task_id>/", BatchStatusAPI.as_view(), name="batch_status"),
    path(
        "<int:product_id>/explain/", forecast_explanation, name="forecast_explanation"
    ),
    path("<int:product_id>/drift/", drift_status, name="drift_status"),
    path("scenario/compare/", scenario_compare, name="scenario_compare"),
]
