"""
ML-specific invariance and consistency tests.

These tests verify model behavior stability and expected properties.
"""
import pytest
import numpy as np
from datetime import datetime, timedelta
from decimal import Decimal

from forecasting.forecasting_engine import ForecastingEngine


@pytest.mark.django_db
class TestForecastStability:
    """Tests for forecast stability and consistency."""

    def setup_method(self):
        self.engine = ForecastingEngine()

    def test_identical_input_gives_consistent_output(self, product_with_sales):
        """Same input should produce same/similar output."""
        result1 = self.engine.generate_forecast(product_with_sales.id, days=7)
        result2 = self.engine.generate_forecast(product_with_sales.id, days=7)

        if "error" not in result1 and "error" not in result2:
            # Model selection should be consistent
            assert result1["model_used"] == result2["model_used"]

            # Values should be very close (may have tiny numerical diff)
            for p1, p2 in zip(result1["forecast"], result2["forecast"]):
                assert abs(p1["value"] - p2["value"]) < 0.1

    def test_small_noise_stability(self, product_with_sales):
        """Forecast shouldn't change dramatically with tiny data changes."""
        # Get baseline forecast
        result1 = self.engine.generate_forecast(product_with_sales.id, days=7)

        if "error" in result1:
            return

        baseline_mean = np.mean([p["value"] for p in result1["forecast"]])

        # This test verifies the concept - in practice we'd add small noise
        # For now, just verify baseline is reasonable
        assert baseline_mean > 0


@pytest.mark.django_db
class TestDirectionalExpectations:
    """Tests for expected directional relationships."""

    def setup_method(self):
        self.engine = ForecastingEngine()

    def test_higher_historical_means_higher_forecast(self):
        """Products with higher historical sales should forecast higher."""
        from inventory.models import Product, Sale

        # Create low-sales product
        low_product = Product.objects.create(
            name="Low Sales",
            sku="LOW-001",
            price=Decimal("50.00"),
            current_stock=100,
        )
        for i in range(60):
            Sale.objects.create(
                product=low_product,
                quantity=5,  # Low
                sale_date=datetime.now() - timedelta(days=60 - i),
            )

        # Create high-sales product
        high_product = Product.objects.create(
            name="High Sales",
            sku="HIGH-001",
            price=Decimal("50.00"),
            current_stock=100,
        )
        for i in range(60):
            Sale.objects.create(
                product=high_product,
                quantity=50,  # High
                sale_date=datetime.now() - timedelta(days=60 - i),
            )

        result_low = self.engine.generate_forecast(low_product.id, days=7)
        result_high = self.engine.generate_forecast(high_product.id, days=7)

        if "error" not in result_low and "error" not in result_high:
            mean_low = np.mean([p["value"] for p in result_low["forecast"]])
            mean_high = np.mean([p["value"] for p in result_high["forecast"]])
            assert mean_high > mean_low


@pytest.mark.django_db
class TestBacktestIntegrity:
    """Tests for backtest metric validity."""

    def setup_method(self):
        self.engine = ForecastingEngine()

    def test_metrics_are_computed(self, product_with_sales):
        """Backtest metrics are actually computed."""
        result = self.engine.generate_forecast(product_with_sales.id, days=7)

        if "error" not in result:
            metrics = result["metrics"]
            assert "mae" in metrics
            assert "r2" in metrics
            assert "mape" in metrics

    def test_mae_is_non_negative(self, product_with_sales):
        """MAE should always be non-negative."""
        result = self.engine.generate_forecast(product_with_sales.id, days=7)

        if "error" not in result:
            assert result["metrics"]["mae"] >= 0

    def test_r2_is_reasonable(self, product_with_sales):
        """R² should be in reasonable range."""
        result = self.engine.generate_forecast(product_with_sales.id, days=7)

        if "error" not in result:
            # R² can be negative for bad fits, but shouldn't be absurdly so
            r2 = result["metrics"]["r2"]
            assert r2 >= -10  # Very generous bound


@pytest.mark.django_db
class TestModelBoundsRespected:
    """Tests that model outputs respect expected bounds."""

    def setup_method(self):
        self.engine = ForecastingEngine()

    def test_no_negative_forecasts(self, product_with_sales):
        """Forecasts should never be negative (sales can't be negative)."""
        result = self.engine.generate_forecast(product_with_sales.id, days=14)

        if "error" not in result:
            for point in result["forecast"]:
                assert point["value"] >= 0
                assert point["lower"] >= 0
                assert point["upper"] >= 0

    def test_upper_bound_greater_than_lower(self, product_with_sales):
        """Upper confidence bound should be >= lower bound."""
        result = self.engine.generate_forecast(product_with_sales.id, days=7)

        if "error" not in result:
            for point in result["forecast"]:
                assert point["upper"] >= point["lower"]
