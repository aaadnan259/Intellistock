from unittest.mock import patch, MagicMock
from django.test import TestCase
from forecasting.retraining_tasks import retrain_model
from inventory.models import Product, Sale

class TestRetrainingTasks(TestCase):

    @patch("forecasting.forecasting_engine.ForecastingEngine")
    def test_retrain_model_delegates_to_engine(self, mock_engine_cls):
        """
        Verify that retrain_model creates a ForecastingEngine and calls
        generate_forecast with the correct arguments.
        """
        # Arrange
        mock_engine = mock_engine_cls.return_value
        expected_metrics = {"mae": 0.5, "r2": 0.9}
        mock_engine.generate_forecast.return_value = {
            "forecast": [],
            "metrics": expected_metrics,
            "model_used": "prophet",
            "reason": "seasonality",
            "mlflow_run_id": "run-123"
        }

        product_id = 123

        # Act
        result = retrain_model(product_id)

        # Assert
        mock_engine_cls.assert_called_once()
        mock_engine.generate_forecast.assert_called_once_with(product_id, days=30)

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["product_id"], product_id)
        self.assertEqual(result["metrics"], expected_metrics)
        self.assertEqual(result["model_used"], "prophet")

    @patch("forecasting.forecasting_engine.ForecastingEngine")
    def test_retrain_model_handles_engine_error(self, mock_engine_cls):
        """
        Verify that retrain_model handles errors returned by the engine.
        """
        # Arrange
        mock_engine = mock_engine_cls.return_value
        error_msg = "Insufficient data"
        mock_engine.generate_forecast.return_value = {"error": error_msg}

        product_id = 456

        # Act
        result = retrain_model(product_id)

        # Assert
        mock_engine.generate_forecast.assert_called_once_with(product_id, days=30)
        self.assertEqual(result["status"], "skipped")
        self.assertEqual(result["reason"], error_msg)
