"""Model drift detection using Evidently AI."""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import pandas as pd

try:
    from evidently.metrics import DatasetDriftMetric
    from evidently.report import Report
except ImportError:  # pragma: no cover - optional dependency/version drift
    DatasetDriftMetric = None
    Report = None

logger = logging.getLogger(__name__)


@dataclass
class DriftReport:
    """Summary of drift detection analysis."""

    timestamp: datetime
    product_id: int
    data_drift_detected: bool
    dataset_drift_score: float
    drifted_features: list[str]
    feature_drift_scores: dict[str, float]
    action_required: bool
    recommendation: str


class DriftDetector:
    """Detects data and model drift for forecasting models."""

    DRIFT_THRESHOLD = 0.5

    def __init__(self) -> None:
        pass

    def prepare_data(self, sales_data: pd.DataFrame) -> pd.DataFrame:
        """Add features for drift analysis."""
        df = sales_data.copy()
        df["sale_date"] = pd.to_datetime(df["sale_date"])
        df = df.sort_values("sale_date")

        # Features for drift analysis
        df["day_of_week"] = df["sale_date"].dt.dayofweek
        df["month"] = df["sale_date"].dt.month
        df["lag_7"] = df["quantity"].shift(7)
        df["rolling_mean_7"] = df["quantity"].rolling(7).mean()

        # Select numeric columns for drift analysis
        numeric_cols = ["quantity", "day_of_week", "month", "lag_7", "rolling_mean_7"]
        return df[numeric_cols].dropna()

    def detect_drift(
        self,
        reference_data: pd.DataFrame,
        current_data: pd.DataFrame,
        product_id: int,
    ) -> DriftReport:
        """Run drift detection comparing reference to current data."""
        if DatasetDriftMetric is None or Report is None:
            return DriftReport(
                timestamp=datetime.now(),
                product_id=product_id,
                data_drift_detected=False,
                dataset_drift_score=0.0,
                drifted_features=[],
                feature_drift_scores={},
                action_required=False,
                recommendation="DRIFT CHECK DISABLED: Evidently unavailable",
            )

        ref = self.prepare_data(reference_data)
        curr = self.prepare_data(current_data)

        if len(ref) < 10 or len(curr) < 5:
            return DriftReport(
                timestamp=datetime.now(),
                product_id=product_id,
                data_drift_detected=False,
                dataset_drift_score=0.0,
                drifted_features=[],
                feature_drift_scores={},
                action_required=False,
                recommendation="INSUFFICIENT DATA: Need more data for drift analysis",
            )

        # Build and run Evidently report
        report = Report(metrics=[DatasetDriftMetric()])
        report.run(reference_data=ref, current_data=curr)

        results = report.as_dict()
        dataset_drift = results["metrics"][0]["result"]

        # Extract drift results
        drift_detected = dataset_drift.get("dataset_drift", False)
        drift_score = dataset_drift.get("share_of_drifted_columns", 0.0)

        # Get per-column drift info
        drifted_features: list[str] = []
        feature_scores: dict[str, float] = {}

        column_info = dataset_drift.get("drift_by_columns", {})
        for col, col_data in column_info.items():
            score = col_data.get("drift_score", 0)
            if isinstance(score, (int, float)):
                feature_scores[col] = float(score)
            if col_data.get("drift_detected"):
                drifted_features.append(col)

        # Generate recommendation
        action_required = drift_detected
        if action_required:
            recommendation = (
                f"RETRAIN RECOMMENDED: {len(drifted_features)} features drifted "
                f"({', '.join(drifted_features[:3])})"
            )
        else:
            recommendation = (
                "NO ACTION: Model remains stable. Data distribution unchanged."
            )

        return DriftReport(
            timestamp=datetime.now(),
            product_id=product_id,
            data_drift_detected=drift_detected,
            dataset_drift_score=round(drift_score, 4),
            drifted_features=drifted_features,
            feature_drift_scores=feature_scores,
            action_required=action_required,
            recommendation=recommendation,
        )


def check_drift_for_product(
    product_id: int,
    reference_data: pd.DataFrame,
    current_data: pd.DataFrame,
) -> dict[str, Any]:
    """Convenience function for API."""
    detector = DriftDetector()
    report = detector.detect_drift(reference_data, current_data, product_id)

    return {
        "product_id": report.product_id,
        "timestamp": report.timestamp.isoformat(),
        "drift_summary": {
            "data_drift_detected": report.data_drift_detected,
            "dataset_drift_score": report.dataset_drift_score,
        },
        "drifted_features": report.drifted_features,
        "feature_drift_scores": report.feature_drift_scores,
        "action_required": report.action_required,
        "recommendation": report.recommendation,
    }
