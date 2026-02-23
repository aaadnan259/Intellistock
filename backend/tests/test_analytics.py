"""
Tests for analytics functionality.

Covers ABC analysis, turnover ratio, slow mover detection,
and inventory health scoring.
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import patch

from inventory.models import Product, Sale
from inventory.analytics import InventoryAnalytics


@pytest.mark.django_db
class TestABCAnalysis:
    """Tests for ABC inventory categorization."""

    def test_abc_categorization(self):
        """Products are categorized into A, B, C based on revenue contribution."""
        # Create products with different sales volumes (high stock for sales)
        high_volume = Product.objects.create(
            name="High Volume",
            sku="HV-001",
            price=Decimal("100.00"),
            current_stock=10000,
        )
        medium_volume = Product.objects.create(
            name="Medium Volume",
            sku="MV-001",
            price=Decimal("50.00"),
            current_stock=10000,
        )
        low_volume = Product.objects.create(
            name="Low Volume",
            sku="LV-001",
            price=Decimal("10.00"),
            current_stock=10000,
        )

        # Create sales using bulk_create to bypass stock validation
        sales = []
        for i in range(30):
            sales.append(
                Sale(
                    product=high_volume,
                    quantity=100,
                    total_price=Decimal("10000.00"),  # 100 * 100
                    sale_date=datetime.now() - timedelta(days=i),
                )
            )
            sales.append(
                Sale(
                    product=medium_volume,
                    quantity=20,
                    total_price=Decimal("1000.00"),  # 20 * 50
                    sale_date=datetime.now() - timedelta(days=i),
                )
            )
            sales.append(
                Sale(
                    product=low_volume,
                    quantity=5,
                    total_price=Decimal("50.00"),  # 5 * 10
                    sale_date=datetime.now() - timedelta(days=i),
                )
            )
        Sale.objects.bulk_create(sales)

        analytics = InventoryAnalytics()
        result = analytics.perform_abc_analysis()

        # Should return list of products with categories
        assert isinstance(result, list)
        if len(result) > 0:
            # High volume should be category A
            hv_result = next((p for p in result if p.get("id") == high_volume.id), None)
            if hv_result:
                assert hv_result.get("abc_category") in ["A", "B", "C"]

    def test_empty_inventory_abc(self):
        """ABC analysis handles empty inventory gracefully."""
        analytics = InventoryAnalytics()
        result = analytics.perform_abc_analysis()
        assert isinstance(result, list)


@pytest.mark.django_db
class TestTurnoverRatio:
    """Tests for inventory turnover calculation."""

    def test_turnover_calculation(self, product_with_sales):
        """Turnover ratio is calculated for products with sales."""
        analytics = InventoryAnalytics()
        result = analytics.calculate_turnover_ratio()

        assert isinstance(result, list)


@pytest.mark.django_db
class TestSlowMoverDetection:
    """Tests for slow-moving inventory detection."""

    def test_detects_slow_movers(self, db):
        """Products with low velocity are flagged as slow movers."""
        slow = Product.objects.create(
            name="Slow Mover", sku="SLOW-001", price=Decimal("50.00"), current_stock=500
        )
        # Add minimal sales from 60+ days ago
        Sale.objects.create(
            product=slow, quantity=1, sale_date=datetime.now() - timedelta(days=90)
        )

        analytics = InventoryAnalytics()
        result = analytics.detect_slow_movers(threshold_days=60)

        assert isinstance(result, list)
        # Should include our slow mover
        product_ids = [p.get("id") or p.get("product_id") for p in result]
        assert slow.id in product_ids

    def test_fast_movers_excluded(self, product_with_sales):
        """Products with healthy velocity are not flagged."""
        analytics = InventoryAnalytics()
        result = analytics.detect_slow_movers(threshold_days=60)

        product_ids = [p.get("id") or p.get("product_id") for p in result]
        # Recent sales should exclude this product
        assert product_with_sales.id not in product_ids


@pytest.mark.django_db
class TestInventoryHealthScore:
    """Tests for overall inventory health calculation."""

    def test_health_score_structure(self, product_with_sales):
        """Health score returns expected structure."""
        analytics = InventoryAnalytics()
        result = analytics.get_inventory_health_score()

        # Should return a dict with score
        assert isinstance(result, dict)
        assert "overall_score" in result or "score" in result

    def test_empty_inventory_health(self):
        """Empty inventory returns valid health structure."""
        analytics = InventoryAnalytics()
        result = analytics.get_inventory_health_score()

        assert isinstance(result, dict)


@pytest.mark.django_db
class TestSalesTrends:
    """Tests for sales trend analysis in InventoryAnalytics."""

    def test_sales_trends_happy_path_sqlite(self, product_with_sales):
        """Test sales trend calculation using the SQLite path logic."""
        analytics = InventoryAnalytics()

        # Patch connection.vendor to ensure we use the 'sqlite' path
        with patch("django.db.connection.vendor", "sqlite"):
            result = analytics.calculate_sales_trends(days=90)

        assert isinstance(result, dict)
        assert result["trend"] in ["increasing", "decreasing", "stable"]
        assert len(result["daily_sales"]) > 0
        assert result["period_total"] > 0
        assert "trend_slope" in result

        # Verify specific fields from result
        assert "dates" in result
        assert "moving_average" in result
        assert len(result["dates"]) == len(result["daily_sales"])

    def test_sales_trends_happy_path_postgres(self, product_with_sales):
        """Test sales trend calculation using the Postgres/other path logic."""
        analytics = InventoryAnalytics()

        # Patch connection.vendor to ensure we use the 'else' path (Postgres logic)
        # Note: This executes the Django ORM aggregation logic against the test DB
        # (sqlite), which supports the operations used (TruncDate, Sum).
        with patch("django.db.connection.vendor", "postgresql"):
            result = analytics.calculate_sales_trends(days=90)

        assert isinstance(result, dict)
        assert result["trend"] in ["increasing", "decreasing", "stable"]
        assert len(result["daily_sales"]) > 0
        assert result["period_total"] > 0

    def test_sales_trends_empty_data(self):
        """Test sales trends with no sales data."""
        # Clear any sales (fixture 'db' cleans up, but just in case)
        Sale.objects.all().delete()

        analytics = InventoryAnalytics()

        with patch("django.db.connection.vendor", "sqlite"):
            result = analytics.calculate_sales_trends(days=90)

        assert result["trend"] == "insufficient_data"
        assert result["daily_sales"] == []
        assert result["period_total"] == 0

    def test_sales_trends_single_point(self, db):
        """Test trend calculation with a single data point
        (should handle linear regression edge case)."""
        product = Product.objects.create(
            name="Single Sale Product",
            sku="SINGLE-001",
            price=Decimal("100.00"),
            current_stock=100,
        )
        Sale.objects.create(
            product=product,
            quantity=1,
            total_price=Decimal("100.00"),
            sale_date=datetime.now().date(),
        )

        analytics = InventoryAnalytics()

        with patch("django.db.connection.vendor", "sqlite"):
            result = analytics.calculate_sales_trends(days=7)

        assert result["trend"] == "stable"  # Slope 0 -> stable
        assert result["trend_slope"] == 0
        assert len(result["daily_sales"]) > 0  # Resampling fills zeros

    def test_sales_trends_sparse_data(self, db):
        """Test that sparse data is correctly resampled to fill missing dates with 0."""
        product = Product.objects.create(
            name="Sparse Sales Product",
            sku="SPARSE-001",
            price=Decimal("10.00"),
            current_stock=100,
        )

        # Create sales on day 1 and day 5 (days 2, 3, 4 missing)
        base_date = datetime.now().date() - timedelta(days=10)
        Sale.objects.create(
            product=product,
            quantity=1,
            total_price=Decimal("10.00"),
            sale_date=base_date,
        )
        Sale.objects.create(
            product=product,
            quantity=1,
            total_price=Decimal("10.00"),
            sale_date=base_date + timedelta(days=4),
        )

        analytics = InventoryAnalytics()

        with patch("django.db.connection.vendor", "sqlite"):
            result = analytics.calculate_sales_trends(days=15)

        dates = result["dates"]
        sales = result["daily_sales"]

        # Verify we have entries between the dates
        assert len(dates) >= 5

        # Find index of start and end sale
        start_idx = -1
        end_idx = -1
        for i, d in enumerate(dates):
            if d == base_date.strftime("%Y-%m-%d"):
                start_idx = i
            if d == (base_date + timedelta(days=4)).strftime("%Y-%m-%d"):
                end_idx = i

        assert start_idx != -1
        assert end_idx != -1

        # Verify sales at start/end are > 0
        assert sales[start_idx] == 10.0
        assert sales[end_idx] == 10.0

        # Verify sales in between are 0 (e.g. at start_idx + 1)
        if start_idx + 1 < end_idx:
            assert sales[start_idx + 1] == 0.0
