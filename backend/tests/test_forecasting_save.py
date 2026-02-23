import pytest
from decimal import Decimal
from inventory.models import Product
from forecasting.forecasting_engine import ForecastingEngine
from forecasting.models import ForecastResult, ModelAccuracy
from datetime import date


@pytest.mark.django_db
class TestForecastingSave:
    def setup_method(self):
        self.engine = ForecastingEngine()
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST-001",
            price=Decimal("10.00"),
            current_stock=100,
        )

    def test_save_forecast_creates_entries(self):
        result = {
            "forecast": [
                {
                    "date": date(2023, 1, 1),
                    "value": 100.0,
                    "lower": 90.0,
                    "upper": 110.0,
                },
                {
                    "date": date(2023, 1, 2),
                    "value": 105.0,
                    "lower": 95.0,
                    "upper": 115.0,
                },
            ],
            "metrics": {"r2": 0.9, "mae": 5.0, "mape": 0.05},
            "model_used": "test_model",
            "reason": "testing",
        }
        characteristics = {"days_count": 50}

        self.engine.save_forecast(self.product, result, characteristics)

        # Verify ForecastResult
        forecasts = ForecastResult.objects.filter(product=self.product)
        assert forecasts.count() == 2
        f1 = forecasts.get(forecast_date=date(2023, 1, 1))
        assert f1.predicted_value == 100.0
        assert f1.model_used == "test_model"

        # Verify ModelAccuracy
        metrics = ModelAccuracy.objects.filter(product=self.product)
        assert metrics.count() == 1
        m1 = metrics.first()
        assert m1.model_name == "test_model"
        assert m1.r2_score == 0.9
        assert m1.sample_size == 50

    def test_save_forecast_updates_existing(self):
        # Create initial forecast
        result1 = {
            "forecast": [
                {
                    "date": date(2023, 1, 1),
                    "value": 100.0,
                    "lower": 90.0,
                    "upper": 110.0,
                }
            ],
            "metrics": {"r2": 0.8, "mae": 6.0, "mape": 0.06},
            "model_used": "test_model",
            "reason": "initial",
        }
        self.engine.save_forecast(self.product, result1)

        # Update with new values
        result2 = {
            "forecast": [
                {
                    "date": date(2023, 1, 1),
                    "value": 120.0,
                    "lower": 110.0,
                    "upper": 130.0,
                }
            ],
            "metrics": {"r2": 0.95, "mae": 2.0, "mape": 0.02},
            "model_used": "test_model",
            "reason": "updated",
        }
        characteristics = {"days_count": 60}
        self.engine.save_forecast(self.product, result2, characteristics)

        # Verify ForecastResult updated
        f1 = ForecastResult.objects.get(
            product=self.product, forecast_date=date(2023, 1, 1)
        )
        assert f1.predicted_value == 120.0
        assert ForecastResult.objects.count() == 1

        # Verify ModelAccuracy updated
        m1 = ModelAccuracy.objects.get(product=self.product, model_name="test_model")
        assert m1.r2_score == 0.95
        assert m1.sample_size == 60
        assert ModelAccuracy.objects.count() == 1
