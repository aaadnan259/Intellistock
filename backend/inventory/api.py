from rest_framework import viewsets, serializers, permissions
from .models import Product, Sale
from django.core.exceptions import ValidationError

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Sale
        # Explicit fields for security
        fields = ['id', 'product', 'product_name', 'quantity', 'total_price', 'sale_date']
        read_only_fields = ['total_price', 'sale_date']

    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except ValidationError as e:
            raise serializers.ValidationError({"detail": e.messages})

class ProductViewSet(viewsets.ModelViewSet):
    # Pagination is handled via REST_FRAMEWORK settings (StandardResultsSetPagination)
    queryset = Product.objects.all().order_by('id') # Ordered for stable pagination
    serializer_class = ProductSerializer
    # Security: Default to Authenticated, or AllowAny if this is a public demo
    # permission_classes = [permissions.IsAuthenticated] 

class SaleViewSet(viewsets.ModelViewSet):
    # Performance: Fetch related product in single query
    queryset = Sale.objects.select_related('product').all().order_by('-sale_date')
    serializer_class = SaleSerializer
    # permission_classes = [permissions.IsAuthenticated]
