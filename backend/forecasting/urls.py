from django.urls import path
from .views import AdvancedForecastAPI, BatchForecastAPI, BatchStatusAPI
from .api_explainability import forecast_explanation

urlpatterns = [
    # path('predict/<int:product_id>/', ForecastAPI.as_view(), name='sales-forecast'), # Legacy
    path("advanced-predict/", AdvancedForecastAPI.as_view(), name="advanced_predict"),
    path("batch-predict/", BatchForecastAPI.as_view(), name="batch_predict"),
    path("batch-status/<str:task_id>/", BatchStatusAPI.as_view(), name="batch_status"),
    path(
        "<int:product_id>/explain/", forecast_explanation, name="forecast_explanation"
    ),
]
