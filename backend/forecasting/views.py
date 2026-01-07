from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from inventory.models import Product
from .utils import predict_sales

class PredictSalesView(APIView):
    def get(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        prediction = predict_sales(product.id)
        
        return Response({
            "product_id": product.id,
            "product_name": product.name,
            "predicted_sales_tomorrow": round(prediction, 2)
        }, status=status.HTTP_200_OK)
