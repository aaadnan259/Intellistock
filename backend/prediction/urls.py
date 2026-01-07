from django.urls import path
from .views import PredictSalesView

urlpatterns = [
    path('predict/<int:product_id>/', PredictSalesView.as_view(), name='predict-sales'),
]
