from django.urls import path
from .api import ForecastAPI

urlpatterns = [
    path('predict/<int:product_id>/', ForecastAPI.as_view(), name='sales-forecast'),
]
