"""
MLflow tracking utilities for the forecasting pipeline.

Provides context managers and helper functions to log experiments,
parameters, metrics, and model artifacts to MLflow.
"""

import logging
from contextlib import contextmanager
from typing import Any, Dict, Optional, Generator

from config.mlflow_config import mlflow_config

logger = logging.getLogger(__name__)

_initialized = False


def init_mlflow() -> None:
    """Initialize MLflow with configuration."""
    global _initialized
    if _initialized:
        return

    if not mlflow_config.enabled:
        logger.info("MLflow tracking disabled")
        _initialized = True
        return

    try:
        import mlflow
    except ImportError:
        logger.warning("MLflow not installed, tracking disabled")
        return

    mlflow.set_tracking_uri(mlflow_config.tracking_uri)

    # Create or get experiment
    experiment = mlflow.get_experiment_by_name(mlflow_config.experiment_name)
    if experiment is None:
        mlflow.create_experiment(
            mlflow_config.experiment_name,
            artifact_location=mlflow_config.artifact_location,
        )
    mlflow.set_experiment(mlflow_config.experiment_name)

    _initialized = True
    logger.info(f"MLflow initialized: {mlflow_config.tracking_uri}")


@contextmanager
def track_forecast_run(
    product_id: int,
    model_type: str,
    run_name: Optional[str] = None,
    tags: Optional[Dict[str, str]] = None,
) -> Generator[Optional[Any], None, None]:
    """
    Context manager for tracking a forecast run.

    Usage:
        with track_forecast_run(product_id=1, model_type="prophet") as run:
            # Training code here
            log_forecast_metrics({"mae": 0.5, "r2": 0.85})

    Args:
        product_id: Product being forecasted
        model_type: Type of model used
        run_name: Optional custom run name
        tags: Optional additional tags

    Yields:
        MLflow ActiveRun object or None if disabled
    """
    if not mlflow_config.enabled:
        yield None
        return

    try:
        import mlflow
    except ImportError:
        yield None
        return

    init_mlflow()

    run_name = run_name or f"forecast_product_{product_id}"
    all_tags = {
        "product_id": str(product_id),
        "model_type": model_type,
        "pipeline": "forecasting",
    }
    if tags:
        all_tags.update(tags)

    with mlflow.start_run(run_name=run_name, tags=all_tags) as run:
        # Log product context
        mlflow.log_param("product_id", product_id)
        mlflow.log_param("model_type", model_type)
        yield run


def log_forecast_params(params: Dict[str, Any]) -> None:
    """Log forecast parameters to active run."""
    if not mlflow_config.enabled:
        return

    try:
        import mlflow
    except ImportError:
        return

    for key, value in params.items():
        try:
            mlflow.log_param(key, value)
        except Exception as e:
            logger.warning(f"Failed to log param {key}: {e}")


def log_forecast_metrics(metrics: Dict[str, float]) -> None:
    """Log forecast metrics to active run."""
    if not mlflow_config.enabled:
        return

    try:
        import mlflow
    except ImportError:
        return

    for key, value in metrics.items():
        try:
            mlflow.log_metric(key, float(value))
        except Exception as e:
            logger.warning(f"Failed to log metric {key}: {e}")


def log_data_characteristics(
    seasonality_score: float,
    coefficient_of_variation: float,
    trend_strength: float,
    n_observations: int,
) -> None:
    """Log data characteristics that influenced model selection."""
    if not mlflow_config.enabled:
        return

    try:
        import mlflow
    except ImportError:
        return

    mlflow.log_params(
        {
            "data_seasonality_score": round(seasonality_score, 4),
            "data_cv": round(coefficient_of_variation, 4),
            "data_trend_strength": round(trend_strength, 4),
            "data_n_observations": n_observations,
        }
    )


def log_model_artifact(model: Any, model_name: str = "model") -> None:
    """
    Log trained model as artifact.

    Handles different model types (Prophet, sklearn-compatible).
    """
    if not mlflow_config.enabled:
        return

    try:
        import mlflow
    except ImportError:
        return

    try:
        model_class = type(model).__name__

        if "Prophet" in model_class:
            # Prophet requires special serialization
            import tempfile
            import os
            from prophet.serialize import model_to_json

            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            ) as f:
                f.write(model_to_json(model))
                temp_path = f.name

            try:
                mlflow.log_artifact(temp_path, artifact_path=model_name)
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
        else:
            # statsmodels and sklearn-compatible models
            mlflow.sklearn.log_model(model, model_name)

        logger.info(f"Logged model artifact: {model_name}")
    except Exception as e:
        logger.warning(f"Failed to log model: {e}")


def log_forecast_plot(fig: Any, name: str = "forecast_plot") -> None:
    """Log a matplotlib figure as artifact."""
    if not mlflow_config.enabled:
        return

    try:
        import mlflow
    except ImportError:
        return

    try:
        mlflow.log_figure(fig, f"{name}.png")
    except Exception as e:
        logger.warning(f"Failed to log figure: {e}")


def get_best_model_for_product(product_id: int) -> Optional[str]:
    """
    Retrieve the best performing model run for a product.

    Returns the run_id of the best model based on MAE.
    """
    if not mlflow_config.enabled:
        return None

    try:
        import mlflow
        from mlflow.tracking import MlflowClient
    except ImportError:
        return None

    init_mlflow()
    client = MlflowClient()
    experiment = mlflow.get_experiment_by_name(mlflow_config.experiment_name)

    if experiment is None:
        return None

    runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        filter_string=f"tags.product_id = '{product_id}'",
        order_by=["metrics.mae ASC"],
        max_results=1,
    )

    return runs[0].info.run_id if runs else None
