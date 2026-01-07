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

    def test_forecast_api_resilience(self):
        # Even with no sales data, API should not crash
        url = reverse('sales-forecast', args=[self.product.id])
        resp = self.client.get(url)
        
        assert resp.status_code == 200
        assert resp.data['forecast_next_day'] == 0.0
