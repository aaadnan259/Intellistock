import pytest
from rest_framework.test import APIClient
from rest_framework import status
from inventory.models import Product, Sale
from django.urls import reverse
from decimal import Decimal

@pytest.mark.django_db
class TestInventoryFlow:
    def setup_method(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            name="Test Widget",
            sku="WIDGET-001",
            price=Decimal("100.00"),
            current_stock=50
        )

    def test_sale_decrements_stock(self):
        """Test that creating a sale reduces the product stock."""
        sale_data = {
            "product": self.product.id,
            "quantity": 5
        }
        url = reverse('sale-list')
        response = self.client.post(url, sale_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        self.product.refresh_from_db()
        assert self.product.current_stock == 45

    def test_overselling_prevention(self):
        """Test that selling more than available stock raises 400."""
        sale_data = {
            "product": self.product.id,
            "quantity": 51 # Database has 50
        }
        url = reverse('sale-list')
        response = self.client.post(url, sale_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Insufficient stock" in str(response.data)

    def test_prediction_endpoint(self):
        """Test that the prediction endpoint returns 200 and correct structure."""
        url = reverse('predict-sales', args=[self.product.id])
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert "predicted_sales_tomorrow" in response.data
