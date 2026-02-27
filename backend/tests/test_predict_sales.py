"""
Tests for predict_sales utility function in forecasting.
Focuses on edge cases: zero, one, or minimal data points.
"""

import pytest
from datetime import date, timedelta
from decimal import Decimal
from inventory.models import Sale
from forecasting.utils import predict_sales

@pytest.mark.django_db
class TestPredictSalesEdgeCases:
    """Edge case testing for the simple linear regression utility."""

    def test_predict_sales_no_data(self, sample_product):
        """If no sales data exists, return 0.0."""
        # Ensure no sales for this product
        Sale.objects.filter(product=sample_product).delete()

        result = predict_sales(sample_product.id)
        assert result == 0.0

    def test_predict_sales_single_data_point(self, sample_product):
        """If only one sales data point exists, return its value (mean)."""
        # Ensure clean state for this product
        Sale.objects.filter(product=sample_product).delete()

        Sale.objects.create(
            product=sample_product,
            quantity=15,
            total_price=Decimal("1500.00"),
            sale_date=date.today()
        )

        result = predict_sales(sample_product.id)
        assert result == 15.0

    def test_predict_sales_invalid_product(self):
        """If product ID doesn't exist, return 0.0 instead of crashing."""
        # Use an ID that doesn't exist
        result = predict_sales(999999)
        assert result == 0.0

    def test_predict_sales_two_data_points(self, sample_product):
        """
        If two data points exist, it should run linear regression.
        Day 1: 10 units
        Day 2: 20 units
        Predicting for Day 3 (tomorrow) should give 30 units.
        """
        # Ensure clean state
        Sale.objects.filter(product=sample_product).delete()

        # Day 1 (yesterday)
        Sale.objects.create(
            product=sample_product,
            quantity=10,
            total_price=Decimal("1000.00"),
            sale_date=date.today() - timedelta(days=1)
        )
        # Day 2 (today)
        Sale.objects.create(
            product=sample_product,
            quantity=20,
            total_price=Decimal("2000.00"),
            sale_date=date.today()
        )

        # Regression: (x1, 10), (x2, 20) where x2 = x1 + 1
        # m = 10, tomorrow = x2 + 1 -> y = 20 + 10 = 30

        result = predict_sales(sample_product.id)
        assert result == 30.0

    def test_predict_sales_negative_regression_clamped(self, sample_product):
        """
        If regression predicts a negative value, it should be clamped to 0.0.
        Day 1: 100 units
        Day 2: 40 units
        Predicting for Day 3 (tomorrow) would be -20 units, clamped to 0.0.
        """
        # Ensure clean state
        Sale.objects.filter(product=sample_product).delete()

        Sale.objects.create(
            product=sample_product,
            quantity=100,
            total_price=Decimal("10000.00"),
            sale_date=date.today() - timedelta(days=1)
        )
        Sale.objects.create(
            product=sample_product,
            quantity=40,
            total_price=Decimal("4000.00"),
            sale_date=date.today()
        )

        # Regression: (0, 100), (1, 40) -> y = -60x + 100
        # Tomorrow (x=2): y = -60(2) + 100 = -120 + 100 = -20
        # Clamped to 0.0

        result = predict_sales(sample_product.id)
        assert result == 0.0
