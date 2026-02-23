from celery import shared_task
from .forecasting_engine import ForecastingEngine
from inventory.models import Product
import logging

logger = logging.getLogger(__name__)


@shared_task
def batch_forecast_task(product_ids, days=30):
    results = []
    engine = ForecastingEngine()

    for pid in product_ids:
        try:
            # We skip heavy analysis save for batch, just do the forecast update
            # Or we can replicate the logic from view.
            # Ideally we want to update the DB.

            # Check if product exists
            if not Product.objects.filter(pk=pid).exists():
                results.append(
                    {
                        "product_id": pid,
                        "status": "failed",
                        "error": "Product not found",
                    }
                )
                continue

            chars = engine.analyze_product_data(pid)
            if not chars:
                results.append(
                    {
                        "product_id": pid,
                        "status": "skipped",
                        "reason": "Insufficient data",
                    }
                )
                continue

            res = engine.generate_forecast(pid, days, "auto")

            # Save to DB
            product = Product.objects.get(pk=pid)
            engine.save_forecast(product, res, chars)

            results.append(
                {"product_id": pid, "status": "success", "model": res["model_used"]}
            )

        except Exception as e:
            logger.error(f"Error forecasting for product {pid}: {str(e)}")
            results.append({"product_id": pid, "status": "error", "error": str(e)})

    return results
