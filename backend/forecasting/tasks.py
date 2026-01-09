from celery import shared_task
from .forecasting_engine import ForecastingEngine
from inventory.models import Product
from .models import ForecastResult, ModelAccuracy
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
                results.append({'product_id': pid, 'status': 'failed', 'error': 'Product not found'})
                continue

            chars = engine.analyze_product_data(pid)
            if not chars:
                results.append({'product_id': pid, 'status': 'skipped', 'reason': 'Insufficient data'})
                continue
                
            res = engine.generate_forecast(pid, days, 'auto')
            
            # Save to DB
            product = Product.objects.get(pk=pid)
            forecast_data = res['forecast']
            for item in forecast_data:
                ForecastResult.objects.update_or_create(
                    product=product,
                    forecast_date=item['date'],
                    defaults={
                        'predicted_value': item['value'],
                        'confidence_lower': item['lower'],
                        'confidence_upper': item['upper'],
                        'model_used': res['model_used']
                    }
                )
            
            # Update metrics
            metrics = res['metrics']
            ModelAccuracy.objects.update_or_create(
                product=product,
                model_name=res['model_used'],
                defaults={
                    'r2_score': metrics['r2'],
                    'mae': metrics['mae'],
                    'mape': metrics['mape'],
                    'sample_size': chars.get('days_count', 0)
                }
            )

            results.append({'product_id': pid, 'status': 'success', 'model': res['model_used']})
            
        except Exception as e:
            logger.error(f"Error forecasting for product {pid}: {str(e)}")
            results.append({'product_id': pid, 'status': 'error', 'error': str(e)})
            
    return results
