from django.urls import path
from .views import AdvancedForecastAPI, BatchForecastAPI, BatchStatusAPI
from .api import ForecastAPI # Keeping original if needed, or ignoring

urlpatterns = [
    # path('predict/<int:product_id>/', ForecastAPI.as_view(), name='sales-forecast'), # Legacy
    path('advanced-predict/', AdvancedForecastAPI.as_view(), name='advanced_predict'),
    path('batch-predict/', BatchForecastAPI.as_view(), name='batch_predict'),
    path('batch-status/<str:task_id>/', BatchStatusAPI.as_view(), name='batch_status'),
]
