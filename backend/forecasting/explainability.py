"""
SHAP-based model explainability for forecasting.

Provides feature importance and contribution analysis for forecast predictions.
"""

import logging
from dataclasses import dataclass
from typing import Any, List

import numpy as np
import pandas as pd
import shap  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class FeatureContribution:
    """Single feature's contribution to a prediction."""

    feature_name: str
    feature_value: float
    shap_value: float
    contribution_percent: float


@dataclass
class ExplainabilityResult:
    """Complete explainability analysis for a forecast."""

    product_id: int
    prediction_date: str
    predicted_value: float
    base_value: float
    feature_contributions: List[FeatureContribution]
    top_positive_drivers: List[FeatureContribution]
    top_negative_drivers: List[FeatureContribution]
    explanation_text: str


class ForecastExplainer:
    """
    Explains forecasting model predictions using SHAP.

    Supports:
    - Feature importance (global)
    - Feature contributions (local, per-prediction)
    - Natural language explanations
    """

    FEATURE_NAMES = {
        "day_of_week": "Day of Week",
        "month": "Month",
        "is_weekend": "Weekend Effect",
        "lag_7": "Last Week Sales",
        "lag_14": "Two Weeks Ago",
        "lag_30": "Last Month Sales",
        "rolling_mean_7": "7-Day Average",
        "rolling_mean_14": "14-Day Average",
        "rolling_std_7": "Recent Volatility",
    }

    def __init__(self) -> None:
        self.explainer: shap.Explainer | None = None
        self.feature_names: list[str] | None = None

    def prepare_features(self, sales_data: pd.DataFrame) -> pd.DataFrame:
        """Create feature matrix from sales data."""
        df = sales_data.copy()
        df["sale_date"] = pd.to_datetime(df["sale_date"])
        df = df.sort_values("sale_date")

        # Time-based features
        df["day_of_week"] = df["sale_date"].dt.dayofweek
        df["month"] = df["sale_date"].dt.month
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

        # Lag features
        df["lag_7"] = df["quantity"].shift(7)
        df["lag_14"] = df["quantity"].shift(14)
        df["lag_30"] = df["quantity"].shift(30)

        # Rolling statistics
        df["rolling_mean_7"] = df["quantity"].rolling(window=7).mean()
        df["rolling_mean_14"] = df["quantity"].rolling(window=14).mean()
        df["rolling_std_7"] = df["quantity"].rolling(window=7).std()

        return df.dropna()

    def fit_explainer(
        self, model: Any, X_train: pd.DataFrame, model_type: str = "tree"
    ) -> None:
        """Fit SHAP explainer to the model."""
        self.feature_names = list(X_train.columns)
        background = shap.sample(X_train, min(100, len(X_train)))

        if model_type == "tree":
            try:
                self.explainer = shap.TreeExplainer(model)
            except Exception:
                self.explainer = shap.KernelExplainer(model.predict, background)
        else:
            self.explainer = shap.KernelExplainer(model.predict, background)

    def explain_prediction(
        self,
        X: pd.DataFrame,
        prediction: float,
        product_id: int,
        prediction_date: str,
    ) -> ExplainabilityResult:
        """Explain a single prediction."""
        if self.explainer is None or self.feature_names is None:
            raise ValueError("Explainer not fitted")

        shap_values = self.explainer.shap_values(X)
        if isinstance(shap_values, list):
            shap_values = shap_values[0]
        if len(shap_values.shape) > 1:
            shap_values = shap_values[0]

        base_value = float(self.explainer.expected_value)
        if isinstance(base_value, np.ndarray):
            base_value = float(base_value[0])

        total_shap = np.sum(np.abs(shap_values))
        contributions = []

        for i, (feature, shap_val) in enumerate(zip(self.feature_names, shap_values)):
            feature_val = float(X.iloc[0, i]) if hasattr(X, "iloc") else float(X[0, i])
            contrib_pct = (abs(shap_val) / total_shap * 100) if total_shap > 0 else 0

            contributions.append(
                FeatureContribution(
                    feature_name=self.FEATURE_NAMES.get(feature, feature),
                    feature_value=round(feature_val, 2),
                    shap_value=round(float(shap_val), 2),
                    contribution_percent=round(contrib_pct, 1),
                )
            )

        contributions.sort(key=lambda x: abs(x.shap_value), reverse=True)
        top_positive = [c for c in contributions if c.shap_value > 0][:3]
        top_negative = [c for c in contributions if c.shap_value < 0][:3]

        explanation = self._generate_explanation_text(
            prediction, base_value, top_positive, top_negative
        )

        return ExplainabilityResult(
            product_id=product_id,
            prediction_date=prediction_date,
            predicted_value=round(prediction, 2),
            base_value=round(base_value, 2),
            feature_contributions=contributions,
            top_positive_drivers=top_positive,
            top_negative_drivers=top_negative,
            explanation_text=explanation,
        )

    def _generate_explanation_text(
        self,
        prediction: float,
        base_value: float,
        positive: list[FeatureContribution],
        negative: list[FeatureContribution],
    ) -> str:
        """Generate human-readable explanation."""
        parts = [f"The forecast of {prediction:.0f} units is "]
        diff = prediction - base_value
        parts.append(
            f"{abs(diff):.0f} units {'above' if diff > 0 else 'below'} baseline."
        )

        if positive:
            drivers = ", ".join([d.feature_name for d in positive[:2]])
            parts.append(f" Key factors UP: {drivers}.")
        if negative:
            drivers = ", ".join([d.feature_name for d in negative[:2]])
            parts.append(f" Factors DOWN: {drivers}.")

        return "".join(parts)

    def get_global_feature_importance(
        self, X: pd.DataFrame, sample_size: int = 100
    ) -> list[dict[str, str | float]]:
        """Calculate global feature importance."""
        if self.explainer is None or self.feature_names is None:
            raise ValueError("Explainer not fitted")

        X_sample = X.sample(min(sample_size, len(X)), random_state=42)
        shap_values = self.explainer.shap_values(X_sample)

        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
        total = np.sum(mean_abs_shap)

        importance: list[dict[str, str | float]] = []
        for i, feature in enumerate(self.feature_names):
            importance.append(
                {
                    "feature": self.FEATURE_NAMES.get(feature, feature),
                    "importance": round(float(mean_abs_shap[i]), 4),
                    "importance_percent": round(
                        float(mean_abs_shap[i] / total * 100), 1
                    ),
                }
            )

        importance.sort(key=lambda x: float(x["importance"]), reverse=True)
        return importance
