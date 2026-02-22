from datetime import timedelta

import pytest
from django.utils import timezone

from inventory.analytics import InventoryAnalytics
from inventory.models import Product, Sale


@pytest.mark.django_db
class TestAnalytics:
    def setup_method(self):
        self.analytics = InventoryAnalytics()

    def test_calculate_sales_trends_no_data(self):
        result = self.analytics.calculate_sales_trends()

        expected = {
            "dates": [],
            "daily_sales": [],
            "daily_units": [],
            "moving_average": [],
            "trend": "insufficient_data",
            "trend_slope": 0,
        }

        assert result == expected

    def test_calculate_sales_trends_with_data(self):
        # Create a product
        product = Product.objects.create(
            name="Test Product",
            sku="TEST-SKU",
            price=10.0,
            current_stock=100,
        )

        # Create some sales
        # Use a date within the last 90 days
        sale_date = timezone.now().date() - timedelta(days=10)
        Sale.objects.create(
            product=product,
            quantity=5,
            sale_date=sale_date,
        )

        result = self.analytics.calculate_sales_trends()

        assert len(result["dates"]) > 0
        assert len(result["daily_sales"]) > 0
        assert result["trend"] in ["increasing", "decreasing", "stable"]
