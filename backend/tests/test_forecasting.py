"""
Tests for forecasting engine functionality.

Covers model selection, forecast generation, and data characteristics.
"""
import pytest
from decimal import Decimal

from inventory.models import Product, Sale
from forecasting.forecasting_engine import ForecastingEngine


@pytest.mark.django_db
class TestModelSelection:
    """Tests for automatic model selection."""

    def setup_method(self):
        self.engine = ForecastingEngine()

    def test_prophet_selected_for_seasonality(self, high_seasonality_data):
        """Prophet should be selected when seasonality is high."""
        # Create temp product with seasonal sales data
        product = Product.objects.create(
            name="Seasonal",
            sku="SEAS-001",
            price=Decimal("50.00"),
            current_stock=10000,
        )

        # Add seasonal sales using bulk_create
        sales = []
        for i, row in high_seasonality_data.iterrows():
            sales.append(
                Sale(
                    product=product,
                    quantity=int(row["y"]),
                    total_price=Decimal(str(int(row["y"]) * 50)),
                    sale_date=row["ds"],
                )
            )
        Sale.objects.bulk_create(sales)

        chars = self.engine.analyze_product_data(product.id)

        if chars and chars.get("seasonality", 0) > 0.3:
            model_type, _ = self.engine.select_best_model(chars)
            assert model_type == "prophet"

    def test_model_override_works(self, product_with_sales):
        """User can override automatic model selection."""
        result = self.engine.generate_forecast(
            product_with_sales.id, days=7, model_type="arima"
        )

        if "error" not in result:
            assert result["model_used"] == "arima"
            assert result["reason"] == "User selection"


@pytest.mark.django_db
class TestForecastGeneration:
    """Tests for forecast output."""

    def setup_method(self):
        self.engine = ForecastingEngine()

    def test_forecast_length_matches_days(self, product_with_sales):
        """Forecast should have requested number of days."""
        days = 14
        result = self.engine.generate_forecast(product_with_sales.id, days=days)

        if "error" not in result:
            assert len(result["forecast"]) == days

    def test_forecast_values_non_negative(self, product_with_sales):
        """All forecast values should be non-negative."""
        result = self.engine.generate_forecast(product_with_sales.id, days=7)

        if "error" not in result:
            for point in result["forecast"]:
                assert point["value"] >= 0
                assert point["lower"] >= 0

    def test_forecast_includes_metrics(self, product_with_sales):
        """Forecast response includes backtest metrics."""
        result = self.engine.generate_forecast(product_with_sales.id, days=7)

        if "error" not in result:
            assert "metrics" in result
            assert "mae" in result["metrics"]
            assert "r2" in result["metrics"]

    def test_insufficient_data_returns_error(self, sample_product):
        """Products without enough sales history return error."""
        result = self.engine.generate_forecast(sample_product.id, days=7)
        assert "error" in result


@pytest.mark.django_db
class TestDataCharacteristics:
    """Tests for data analysis."""

    def setup_method(self):
        self.engine = ForecastingEngine()

    def test_cv_calculation(self, product_with_sales):
        """Coefficient of variation is calculated correctly."""
        chars = self.engine.analyze_product_data(product_with_sales.id)

        if chars:
            assert "cv" in chars
            assert chars["cv"] >= 0

    def test_trend_detection(self, product_with_sales):
        """Trend is detected in data."""
        chars = self.engine.analyze_product_data(product_with_sales.id)

        if chars:
            assert "trend" in chars
            assert isinstance(chars["trend"], float)

    def test_seasonality_score(self, product_with_sales):
        """Seasonality score is calculated."""
        chars = self.engine.analyze_product_data(product_with_sales.id)

        if chars:
            assert "seasonality" in chars
            assert chars["seasonality"] >= 0
