"""
MLflow configuration for Intellistock forecasting pipeline.

Provides centralized configuration with environment variable overrides
for flexible deployment across dev, staging, and production environments.
"""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass
class MLflowConfig:
    """MLflow configuration with environment variable overrides."""

    # Tracking URI - local file store by default, can point to server
    tracking_uri: str = os.getenv("MLFLOW_TRACKING_URI", "file:./mlruns")

    # Experiment name
    experiment_name: str = os.getenv(
        "MLFLOW_EXPERIMENT_NAME", "intellistock-forecasting"
    )

    # Artifact location
    artifact_location: str = os.getenv("MLFLOW_ARTIFACT_LOCATION", "./mlartifacts")

    # Model registry URI (same as tracking by default)
    registry_uri: str = os.getenv("MLFLOW_REGISTRY_URI", "")

    # Enable/disable MLflow (useful for testing)
    enabled: bool = os.getenv("MLFLOW_ENABLED", "true").lower() == "true"

    # Auto-log settings
    autolog_disable_for_unsupported_versions: bool = True

    def __post_init__(self) -> None:
        """Ensure artifact directory exists for local storage."""
        if self.artifact_location.startswith("./"):
            Path(self.artifact_location).mkdir(parents=True, exist_ok=True)


# Global config instance
mlflow_config = MLflowConfig()
