from rest_framework import viewsets, permissions
from .models import Product, Sale
from .serializers import ProductSerializer, SaleSerializer


class ProductViewSet(viewsets.ModelViewSet):
    # Pagination is handled via REST_FRAMEWORK settings (StandardResultsSetPagination)
    # Optimized: Prefetch sales to prevent N+1 queries when accessing sales history
    queryset = Product.objects.prefetch_related("sales").all().order_by("id")
    serializer_class = ProductSerializer
    # Security: Default to Authenticated, or AllowAny if this is a public demo
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class SaleViewSet(viewsets.ModelViewSet):
    # Performance: Fetch related product in single query
    queryset = Sale.objects.select_related("product").all().order_by("-sale_date")
    serializer_class = SaleSerializer
    permission_classes = [permissions.AllowAny]
