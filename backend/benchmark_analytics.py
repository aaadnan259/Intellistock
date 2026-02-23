import os
import sys
import time
import random
import datetime
import django
from django.utils import timezone
from datetime import timedelta

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from inventory.models import Product, Sale
from inventory.analytics import InventoryAnalytics

def run_benchmark():
    print("Setting up benchmark data...")

    # Clean up existing data (optional, be careful in production)
    Sale.objects.all().delete()
    Product.objects.all().delete()

    # Create a product
    product = Product.objects.create(
        name="Benchmark Product",
        sku="BENCH-001",
        price=10.0,
        current_stock=100000
    )

    # Create 50,000 sales records over the last 90 days
    sales_count = 50000
    start_date = timezone.now().date() - timedelta(days=90)

    sales = []
    print(f"Creating {sales_count} sales records...")

    batch_size = 5000
    for i in range(0, sales_count, batch_size):
        batch_sales = []
        for j in range(batch_size):
            if i + j >= sales_count:
                break
            sale_date = start_date + timedelta(days=random.randint(0, 90))
            batch_sales.append(Sale(
                product=product,
                quantity=random.randint(1, 5),
                total_price=random.uniform(10.0, 50.0),
                sale_date=sale_date
            ))
        Sale.objects.bulk_create(batch_sales)
        print(f"Created batch {i // batch_size + 1}")

    analytics = InventoryAnalytics()

    print("\nStarting benchmark...")

    # Warmup run (optional)
    # analytics.calculate_sales_trends(days=90)

    start_time = time.time()
    result = analytics.calculate_sales_trends(days=90)
    end_time = time.time()

    duration = end_time - start_time
    print(f"\ncalculate_sales_trends with {sales_count} records took: {duration:.4f}s")

    # Verify result structure
    if result['trend'] in ['increasing', 'decreasing', 'stable', 'insufficient_data']:
        print("Result structure verified.")
    else:
        print("WARNING: unexpected result structure.")

    # Optional: print memory usage via psutil if available
    try:
        import psutil
        process = psutil.Process(os.getpid())
        print(f"Memory usage: {process.memory_info().rss / 1024 / 1024:.2f} MB")
    except ImportError:
        pass

if __name__ == "__main__":
    run_benchmark()
