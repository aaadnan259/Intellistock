import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from inventory.models import Product, Sale
from django.urls import reverse

@pytest.mark.django_db
class TestSalesLogic:
    def setup_method(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            name="Test Widget",
            sku="WIDGET-X",
            price=Decimal("100.00"),
            current_stock=10
        )

    def test_stock_decrement(self):
        # Action: Sell 2 items
        Sale.objects.create(product=self.product, quantity=2)
        
        # Check: Stock should be 8
        self.product.refresh_from_db()
        assert self.product.current_stock == 8

    def test_prevent_overselling_api(self):
        # Action: Try to sell 20 items (DB has 10)
        url = reverse('sale-list')
        resp = self.client.post(url, {
            'product': self.product.id,
            'quantity': 20
        })
        
        assert resp.status_code == 400
        assert "Stock insufficient" in str(resp.data)

    def test_advanced_forecast_api_resilience(self):
        """Test that forecast endpoint handles products with insufficient data gracefully"""
        url = reverse('advanced_predict')
        resp = self.client.post(url, {
            'product_id': self.product.id,
            'days': 7,
            'model': 'auto'
        }, format='json')
        
        # Should return 400 with insufficient data message (not crash)
        assert resp.status_code == 400
        assert 'insufficient' in resp.data.get('error', '').lower() or 'data' in resp.data.get('error', '').lower()
