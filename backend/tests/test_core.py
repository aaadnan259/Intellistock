import pytest
from rest_framework.test import APIClient
from rest_framework import status
from inventory.models import Product, Sale
from django.urls import reverse
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User

@pytest.fixture(autouse=True)
def mock_redis(settings):
    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

@pytest.mark.django_db
class TestInventoryFlow:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='password')
        self.client.force_authenticate(user=self.user)
        
        self.product = Product.objects.create(
            name="Test Widget",
            sku="WIDGET-001",
            price=Decimal("100.00"),
            current_stock=1000
        )

    def test_sale_decrements_stock(self):
        """Test that creating a sale reduces the product stock."""
        sale_data = {
            "product": self.product.id,
            "quantity": 5
        }
        url = reverse('sale-list')
        response = self.client.post(url, sale_data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        self.product.refresh_from_db()
        assert self.product.current_stock == 995

    def test_overselling_prevention(self):
        """Test that selling more than available stock raises 400."""
        sale_data = {
            "product": self.product.id,
            "quantity": 2000  # Database has 1000
        }
        url = reverse('sale-list')
        response = self.client.post(url, sale_data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_product_list(self):
        """Test that product list endpoint works."""
        url = reverse('product-list')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint."""
        url = reverse('inventory-stats')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'total_products' in response.data
        assert 'inventory_value' in response.data


@pytest.mark.django_db
class TestAnalytics:
    def setup_method(self):
        self.client = APIClient()
        # Create test products
        self.products = []
        for i in range(5):
            p = Product.objects.create(
                name=f"Product {i}",
                sku=f"SKU-{i:03d}",
                price=Decimal("50.00"),
                current_stock=1000
            )
            self.products.append(p)
        
        # Create sales data
        base_date = timezone.now().date() - timedelta(days=30)
        for product in self.products[:3]:  # Only first 3 have sales
            for day in range(30):
                Sale.objects.create(
                    product=product,
                    quantity=5,
                    total_price=Decimal("250.00"),
                    sale_date=base_date + timedelta(days=day)
                )

    def test_abc_analysis(self):
        """Test ABC analysis endpoint."""
        url = reverse('analytics-abc')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'a_items' in response.data
        assert 'b_items' in response.data
        assert 'c_items' in response.data
        assert 'summary' in response.data

    def test_slow_movers(self):
        """Test slow movers detection."""
        url = reverse('analytics-slow-movers')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Products 3 and 4 have no sales, should be detected
        assert len(response.data) >= 2

    def test_sales_trends(self):
        """Test sales trends endpoint."""
        url = reverse('analytics-sales-trends')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'dates' in response.data
        assert 'daily_sales' in response.data
        assert 'trend' in response.data
    
    def test_inventory_health(self):
        """Test inventory health endpoint."""
        url = reverse('analytics-health')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # Fixed: API returns 'score' not 'health_score'
        assert 'score' in response.data
        assert 'grade' in response.data
        assert 'factors' in response.data

    def test_top_products(self):
        """Test top products endpoint."""
        url = reverse('analytics-top-products')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # Should return a list
        assert isinstance(response.data, list)


@pytest.mark.django_db
class TestForecasting:
    def setup_method(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            name="Forecast Test Product",
            sku="FCAST-001",
            price=Decimal("75.00"),
            current_stock=1000
        )
        
        # Create 60 days of historical sales
        base_date = timezone.now().date() - timedelta(days=60)
        for day in range(60):
            # Variable quantities to simulate real patterns
            qty = 5 + (day % 7)  # Weekly pattern
            Sale.objects.create(
                product=self.product,
                quantity=qty,
                total_price=Decimal(str(qty * 75)),
                sale_date=base_date + timedelta(days=day)
            )

    def test_advanced_forecast(self):
        """Test advanced forecasting endpoint."""
        url = reverse('advanced_predict')
        response = self.client.post(url, {
            'product_id': self.product.id,
            'days': 7,
            'model': 'auto'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'forecast' in response.data
        assert 'metrics' in response.data
        assert 'model_used' in response.data
        
    def test_forecast_with_insufficient_data(self):
        """Test forecast fails gracefully with insufficient data."""
        # Create product with no sales
        empty_product = Product.objects.create(
            name="Empty Product",
            sku="EMPTY-001",
            price=Decimal("50.00"),
            current_stock=100
        )
        
        url = reverse('advanced_predict')
        response = self.client.post(url, {
            'product_id': empty_product.id,
            'days': 7,
            'model': 'auto'
        }, format='json')
        
        # Should return 400 with helpful error message
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
