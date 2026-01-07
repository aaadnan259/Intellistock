from rest_framework import viewsets
from .models import Product, Sale
from .serializers import ProductSerializer, SaleSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class SaleViewSet(viewsets.ModelViewSet):
    # Optimization: N+1 query killer
    queryset = Sale.objects.select_related('product').all().order_by('-sale_date')
    serializer_class = SaleSerializer
