"""
Shared pytest fixtures for Intellistock test suite.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal

import pandas as pd
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from inventory.models import Product, Sale


@pytest.fixture(autouse=True)
def mock_redis(settings):
    """Use dummy cache for tests."""
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.dummy.DummyCache",
        }
    }


@pytest.fixture
def api_client():
    """Authenticated API client."""
    user = User.objects.create_user(username="testuser", password="testpass")
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def sample_product(db):
    """A sample product with reasonable stock."""
    return Product.objects.create(
        name="Test Widget",
        sku="TEST-001",
        price=Decimal("99.99"),
        current_stock=500,
    )


@pytest.fixture
def low_stock_product(db):
    """A product with low stock."""
    return Product.objects.create(
        name="Scarce Item",
        sku="SCARCE-001",
        price=Decimal("199.99"),
        current_stock=5,
    )


@pytest.fixture
def sample_sales_data():
    """
    Sales data for forecasting tests.
    90 days of realistic sales with some patterns.
    """
    dates = pd.date_range(end=datetime.now(), periods=90, freq="D")
    # Simulate weekly seasonality + trend
    base = 50
    trend = [base + i * 0.1 for i in range(90)]
    seasonality = [5 * (1 if d.weekday() < 5 else 0.3) for d in dates]
    noise = [i % 7 for i in range(90)]
    values = [max(0, t + s + n) for t, s, n in zip(trend, seasonality, noise)]

    return pd.DataFrame({"ds": dates, "y": values})


@pytest.fixture
def minimal_sales_data():
    """
    Minimum viable sales data (30 days).
    Just enough for forecasting.
    """
    dates = pd.date_range(end=datetime.now(), periods=30, freq="D")
    values = [10 + i % 5 for i in range(30)]
    return pd.DataFrame({"ds": dates, "y": values})


@pytest.fixture
def insufficient_sales_data():
    """
    Insufficient data for forecasting (< 14 days).
    Should trigger validation errors.
    """
    dates = pd.date_range(end=datetime.now(), periods=7, freq="D")
    values = [10] * 7
    return pd.DataFrame({"ds": dates, "y": values})


@pytest.fixture
def high_seasonality_data():
    """
    Data with strong weekly seasonality.
    Should trigger Prophet model selection.
    """
    dates = pd.date_range(end=datetime.now(), periods=90, freq="D")
    # Strong weekend vs weekday difference
    values = [100 if d.weekday() < 5 else 20 for d in dates]
    return pd.DataFrame({"ds": dates, "y": values})


@pytest.fixture
def trending_data():
    """
    Data with clear upward trend.
    Should work well with ARIMA.
    """
    dates = pd.date_range(end=datetime.now(), periods=90, freq="D")
    values = [10 + i * 2 for i in range(90)]  # Linear growth
    return pd.DataFrame({"ds": dates, "y": values})


@pytest.fixture
def flat_data():
    """
    Flat, stable data with low variance.
    """
    dates = pd.date_range(end=datetime.now(), periods=90, freq="D")
    values = [50 + (i % 3 - 1) for i in range(90)]  # Very low variance
    return pd.DataFrame({"ds": dates, "y": values})


@pytest.fixture
def product_with_sales(db):
    """
    Product with 90 days of sales history.
    Uses bulk_create with total_price to bypass stock validation.
    """
    product = Product.objects.create(
        name="Test Widget Sales",
        sku="SALES-001",
        price=Decimal("99.99"),
        current_stock=10000,
    )

    sales = []
    for i in range(90):
        qty = 10 + (i % 5)
        sales.append(
            Sale(
                product=product,
                quantity=qty,
                total_price=Decimal(str(qty * 99.99)),
                sale_date=datetime.now() - timedelta(days=90 - i),
            )
        )
    Sale.objects.bulk_create(sales)
    return product


@pytest.fixture
def product_with_minimal_sales(db):
    """
    Product with exactly 30 days of sales (minimum required).
    """
    product = Product.objects.create(
        name="Minimal Sales Product",
        sku="MIN-001",
        price=Decimal("50.00"),
        current_stock=5000,
    )

    sales = []
    for i in range(30):
        sales.append(
            Sale(
                product=product,
                quantity=10,
                total_price=Decimal("500.00"),
                sale_date=datetime.now() - timedelta(days=30 - i),
            )
        )
    Sale.objects.bulk_create(sales)
    return product
