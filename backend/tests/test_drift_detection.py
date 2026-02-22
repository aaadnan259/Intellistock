import unittest
from datetime import datetime, timedelta
import pandas as pd
from unittest.mock import MagicMock, patch
from forecasting.drift_detection import DriftDetector, DriftReport

class TestDriftDetector(unittest.TestCase):
    def setUp(self):
        self.detector = DriftDetector()

        # Sample data setup
        self.dates = [datetime(2023, 1, 1) + timedelta(days=i) for i in range(20)]
        self.quantities = [10 + i for i in range(20)]
        self.data = pd.DataFrame({
            "sale_date": self.dates,
            "quantity": self.quantities
        })

    def test_prepare_data_structure(self):
        """Test that prepare_data adds required columns and returns correct structure."""
        df = self.detector.prepare_data(self.data)

        # Check columns
        expected_cols = ["quantity", "day_of_week", "month", "lag_7", "rolling_mean_7"]
        for col in expected_cols:
            self.assertIn(col, df.columns)

        # Check that NaN rows (first 7) are dropped
        self.assertEqual(len(df), 20 - 7)

    def test_prepare_data_sorting(self):
        """Test that data is sorted by date."""
        # Create unsorted data
        unsorted_data = self.data.sample(frac=1, random_state=42)
        df = self.detector.prepare_data(unsorted_data)

        # Check if quantities are sorted (since they correlate with date in our sample)
        quantities = df["quantity"].values
        # Ensure strictly increasing (or at least non-decreasing)
        self.assertTrue((quantities[:-1] <= quantities[1:]).all())
        # First value should be the 8th value (index 7) from original sorted data: 10 + 7 = 17
        self.assertEqual(quantities[0], 17)

    def test_prepare_data_calculations(self):
        """Test calculation of lag and rolling mean."""
        df = self.detector.prepare_data(self.data)

        # Check lag_7
        # The first row in result corresponds to index 7 of original data.
        # Its lag_7 should be the value at index 0 (10).
        self.assertEqual(df.iloc[0]["lag_7"], 10.0)

        # Check rolling_mean_7
        # At index 7, rolling mean of quantities [11, 12, 13, 14, 15, 16, 17]
        # (Assuming rolling(7) includes current row and 6 prior)
        # Sum = 11+12+13+14+15+16+17 = 98. Mean = 14.
        self.assertAlmostEqual(df.iloc[0]["rolling_mean_7"], 14.0)

    def test_prepare_data_empty(self):
        """Test handling of empty dataframe."""
        empty_df = pd.DataFrame({"sale_date": [], "quantity": []})
        result = self.detector.prepare_data(empty_df)
        self.assertTrue(result.empty)
        self.assertListEqual(sorted(list(result.columns)), sorted(["quantity", "day_of_week", "month", "lag_7", "rolling_mean_7"]))

    @patch("forecasting.drift_detection.DatasetDriftMetric")
    @patch("forecasting.drift_detection.Report")
    def test_detect_drift_happy_path(self, MockReport, MockMetric):
        """Test drift detection when dependencies are available."""
        # Setup mocks
        mock_report_instance = MockReport.return_value
        mock_report_instance.as_dict.return_value = {
            "metrics": [{
                "result": {
                    "dataset_drift": True,
                    "share_of_drifted_columns": 0.6,
                    "drift_by_columns": {
                        "quantity": {"drift_detected": True, "drift_score": 0.8},
                        "lag_7": {"drift_detected": False, "drift_score": 0.1}
                    }
                }
            }]
        }

        result = self.detector.detect_drift(self.data, self.data, product_id=1)

        self.assertIsInstance(result, DriftReport)
        self.assertTrue(result.data_drift_detected)
        self.assertEqual(result.dataset_drift_score, 0.6)
        self.assertIn("quantity", result.drifted_features)

    def test_detect_drift_insufficient_data(self):
        """Test drift detection with insufficient data."""
        # Need at least 10 rows for ref and 5 for current
        short_data = self.data.iloc[:5]
        result = self.detector.detect_drift(short_data, short_data, product_id=1)

        self.assertFalse(result.data_drift_detected)
        self.assertIn("INSUFFICIENT DATA", result.recommendation)

    def test_detect_drift_missing_dependencies(self):
        """Test graceful degradation when evidently is missing."""
        # Force the module-level variables to be None for this test
        with patch("forecasting.drift_detection.DatasetDriftMetric", None), \
             patch("forecasting.drift_detection.Report", None):
            result = self.detector.detect_drift(self.data, self.data, product_id=1)

        self.assertFalse(result.data_drift_detected)
        self.assertIn("DRIFT CHECK DISABLED", result.recommendation)
