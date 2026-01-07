from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from inventory.models import Product
from .engine import run_forecast

class ForecastAPI(APIView):
    def get(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        forecast_val = run_forecast(product.id)
        
        return Response({
            "product_id": product.id,
            "product_name": product.name,
            "forecast_next_day": round(forecast_val, 2)
        }, status=status.HTTP_200_OK)
