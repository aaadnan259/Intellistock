import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from inventory.models import Product, Sale
from forecasting.forecasting_engine import ForecastingEngine

def test_engine():
    print("Testing Forecasting Engine...")
    
    # Get a product with data
    product = Product.objects.first()
    if not product:
        print("No products found! Seed data first.")
        return

    print(f"Analyzing product: {product.name} ({product.sku})")
    
    engine = ForecastingEngine()
    
    # 1. Analyze
    chars = engine.analyze_product_data(product.id)
    if not chars:
        print("Not enough data to analyze.")
        # Try to find one with sales
        for p in Product.objects.all():
            if Sale.objects.filter(product=p).count() > 14:
                product = p
                chars = engine.analyze_product_data(p.id)
                print(f"Switched to: {p.name}")
                break
        
    print(f"Characteristics: {chars}")
    
    if not chars:
        print("Skipping forecast test due to insufficient data.")
        return

    # 2. Select Model
    model, reason = engine.select_best_model(chars)
    print(f"Selected Model: {model} ({reason})")
    
    # 3. Forecast
    print("Generating Forecast...")
    try:
        res = engine.generate_forecast(product.id, days=5, model_type='auto')
        print("Forecast successful!")
        print(f"Model Used: {res['model_used']}")
        print(f"Metrics: {res['metrics']}")
        print("Sample Forecast Data (first 3):")
        for item in res['forecast'][:3]:
            print(item)
    except Exception as e:
        print(f"Forecast Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_engine()
