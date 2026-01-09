import pytest
import time
from django.urls import reverse
from rest_framework.test import APIClient
from inventory.models import Product, Sale
from django.utils import timezone
from datetime import timedelta
import random

@pytest.mark.django_db
class TestPerformance:
    def setup_method(self):
        self.client = APIClient()

    def test_product_list_performance_1k(self):
        # Seed 1000 products
        products = [Product(
            name=f"Product {i}", 
            sku=f"SKU-{i}", 
            price=10.0, 
            current_stock=100
        ) for i in range(1000)]
        Product.objects.bulk_create(products)
        
        start_time = time.time()
        response = self.client.get('/api/inventory/products/')
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"\nProduct List (1k items) took: {duration:.4f}s")
        
        assert response.status_code == 200
        assert duration < 0.5, "Product list too slow (>500ms)"

    def test_forecast_performance(self):
        # Create product with history
        p = Product.objects.create(name="Forecast Test", sku="F-TEST", price=100, current_stock=50)
        
        sales = []
        base_date = timezone.now().date() - timedelta(days=60)
        for i in range(60):
             sales.append(Sale(
                 product=p, 
                 quantity=random.randint(1, 10), 
                 total_price=50.0, 
                 sale_date=base_date + timedelta(days=i)
             ))
        Sale.objects.bulk_create(sales)
        
        start_time = time.time()
        response = self.client.post('/api/forecasting/advanced-predict/', {
            'product_id': p.id,
            'days': 30,
            'model': 'auto'
        })
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"\nForecast Generation took: {duration:.4f}s")
        
        assert response.status_code == 200
        assert duration < 2.0, "Forecasting too slow (>2s)"

    def test_analytics_performance(self):
        start_time = time.time()
        response = self.client.get('/api/inventory/analytics/abc-analysis/')
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"\nABC Analysis took: {duration:.4f}s")
        
        assert response.status_code == 200
        assert duration < 1.0, "Analytics too slow (>1s)"
