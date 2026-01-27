"""
Forecasting Configuration Module

Centralized configuration for ML forecasting hyperparameters.
Allows easy tuning without modifying core logic.
"""

from dataclasses import dataclass, field
from typing import Dict, Tuple
import os


@dataclass
class ForecastingConfig:
    """Configuration for the ForecastingEngine."""

    # Model Selection Thresholds
    seasonality_threshold: float = 0.3  # Above this -> Prophet
    cv_low_threshold: float = 0.5  # Below this with trend -> ARIMA
    cv_high_threshold: float = 1.0  # Above this -> Exponential Smoothing
    trend_threshold: float = 0.01  # Minimum slope to consider "trending"

    # Train/Test Split
    validation_split: float = 0.8  # 80% train, 20% test for backtesting

    # Minimum Data Requirements
    min_data_points: int = 14  # At least 2 weeks of data

    # Prophet Configuration
    prophet_daily_seasonality: bool = True
    prophet_yearly_seasonality_threshold: int = 365  # Enable if data > this

    # ARIMA Configuration
    arima_default_order: Tuple[int, int, int] = (1, 1, 1)
    arima_p_range: int = 3  # Search p in range(0, arima_p_range)
    arima_q_range: int = 3  # Search q in range(0, arima_q_range)
    arima_d: int = 1  # Differencing order (fixed for MVP)
    arima_confidence_alpha: float = 0.2  # 80% confidence interval

    # Exponential Smoothing Configuration
    es_seasonal_periods: int = 7  # Weekly seasonality
    es_trend: str = "add"  # Additive trend
    es_confidence_z: float = 1.28  # Z-score for ~80% CI

    # Ensemble Weights (future use)
    ensemble_weights: Dict[str, float] = field(
        default_factory=lambda: {"prophet": 0.4, "arima": 0.3, "exponential": 0.3}
    )

    @classmethod
    def from_env(cls) -> "ForecastingConfig":
        """Load config with optional environment variable overrides."""
        config = cls()

        # Allow environment overrides for key parameters
        val_split = os.getenv("FORECAST_VALIDATION_SPLIT")
        if val_split:
            config.validation_split = float(val_split)

        min_points = os.getenv("FORECAST_MIN_DATA_POINTS")
        if min_points:
            config.min_data_points = int(min_points)

        season_thresh = os.getenv("FORECAST_SEASONALITY_THRESHOLD")
        if season_thresh:
            config.seasonality_threshold = float(season_thresh)

        return config


# Global singleton instance
forecasting_config = ForecastingConfig.from_env()
