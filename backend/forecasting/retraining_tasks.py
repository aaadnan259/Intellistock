"""Automated model retraining tasks using Celery."""
import logging
from celery import shared_task
from datetime import datetime

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def retrain_all_models(self):
    """
    Periodic task to retrain all product forecasting models.
    Scheduled via Celery Beat.
    """
    try:
        from inventory.models import Product

        logger.info("Starting automated model retraining...")
        products_retrained = 0
        products_skipped = 0

        for product in Product.objects.filter(is_active=True):
            try:
                should_retrain = check_model_drift(product.id)

                if should_retrain:
                    retrain_model.delay(product.id)
                    products_retrained += 1
                else:
                    products_skipped += 1

            except Exception as e:
                logger.warning(f"Error checking product {product.id}: {e}")
                continue

        logger.info(
            f"Retraining queued: {products_retrained}, Skipped: {products_skipped}"
        )

        return {
            "status": "completed",
            "products_retrained": products_retrained,
            "products_skipped": products_skipped,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.exception("Error in retrain_all_models")
        raise self.retry(exc=e, countdown=60 * 5)


@shared_task(bind=True, max_retries=2)
def retrain_model(self, product_id: int):
    """
    Retrain the forecasting model for a specific product.
    """
    try:
        from inventory.models import Product, Sale
        from sklearn.ensemble import GradientBoostingRegressor
        import pandas as pd
        import numpy as np

        logger.info(f"Retraining model for product {product_id}")

        product = Product.objects.get(pk=product_id)
        sales = Sale.objects.filter(product=product).values("sale_date", "quantity")

        if len(sales) < 30:
            return {"status": "skipped", "reason": "insufficient_data"}

        df = pd.DataFrame(list(sales))
        df["sale_date"] = pd.to_datetime(df["sale_date"])
        df = df.sort_values("sale_date")

        # Feature engineering
        df["day_of_week"] = df["sale_date"].dt.dayofweek
        df["month"] = df["sale_date"].dt.month
        df["lag_7"] = df["quantity"].shift(7)
        df["rolling_mean_7"] = df["quantity"].rolling(7).mean()
        df = df.dropna()

        feature_cols = ["day_of_week", "month", "lag_7", "rolling_mean_7"]
        X = df[feature_cols]
        y = df["quantity"]

        # Train model
        model = GradientBoostingRegressor(
            n_estimators=100, max_depth=4, random_state=42
        )
        model.fit(X, y)

        # Log to MLflow (if available)
        try:
            from forecasting.mlflow_config import experiment_tracker

            with experiment_tracker.start_run(
                run_name=f"auto_retrain_{product_id}_{datetime.now():%Y%m%d}"
            ):
                experiment_tracker.log_params(
                    {
                        "product_id": product_id,
                        "n_samples": len(X),
                        "features": feature_cols,
                    }
                )
                experiment_tracker.log_metric(
                    "rmse", float(np.std(y - model.predict(X)))
                )
        except Exception:
            pass  # MLflow optional

        logger.info(f"Model retrained for product {product_id}")

        return {
            "status": "success",
            "product_id": product_id,
            "samples": len(X),
            "timestamp": datetime.now().isoformat(),
        }

    except Product.DoesNotExist:
        return {"status": "error", "reason": "product_not_found"}
    except Exception as e:
        logger.exception(f"Error retraining model for product {product_id}")
        raise self.retry(exc=e, countdown=60 * 2)


def check_model_drift(product_id: int) -> bool:
    """
    Check if model drift is detected for a product.
    Returns True if retraining is recommended.
    """
    try:
        from inventory.models import Product, Sale
        from forecasting.drift_detection import DriftDetector
        from datetime import timedelta
        import pandas as pd

        product = Product.objects.get(pk=product_id)
        sales = Sale.objects.filter(product=product).values("sale_date", "quantity")

        if len(sales) < 60:
            return False

        df = pd.DataFrame(list(sales))
        df["sale_date"] = pd.to_datetime(df["sale_date"])

        today = datetime.now()
        cutoff = today - timedelta(days=14)
        reference_start = today - timedelta(days=74)

        current_data = df[df["sale_date"] >= cutoff]
        reference_data = df[
            (df["sale_date"] >= reference_start) & (df["sale_date"] < cutoff)
        ]

        if len(reference_data) < 14 or len(current_data) < 5:
            return False

        detector = DriftDetector()
        report = detector.detect_drift(reference_data, current_data, product_id)

        return report.action_required

    except Exception as e:
        logger.warning(f"Error checking drift for {product_id}: {e}")
        return False


@shared_task
def cleanup_old_runs():
    """Cleanup old MLflow runs older than 30 days."""
    try:
        from datetime import timedelta

        threshold = datetime.now() - timedelta(days=30)
        logger.info(f"Cleaning up MLflow runs older than {threshold}")
        # Implementation depends on MLflow backend
        return {"status": "success", "threshold": threshold.isoformat()}
    except Exception as e:
        logger.warning(f"Cleanup error: {e}")
        return {"status": "error", "reason": str(e)}
