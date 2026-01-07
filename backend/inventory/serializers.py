from rest_framework import serializers
from .models import Product, Sale
from django.core.exceptions import ValidationError as DjangoValidationError

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Sale
        fields = ['id', 'product', 'product_name', 'quantity', 'total_price', 'sale_date']
        read_only_fields = ['total_price', 'sale_date']

    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"error": e.messages})
