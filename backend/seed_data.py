import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'intellistock.settings')
django.setup()

from inventory.models import Product, Sale, Order

def seed():
    print("Seeding data...")
    
    # Create Products
    products = [
        {'name': 'High-Performance Laptop', 'sku': 'LPT-X1', 'price': 1200.00, 'stock': 45},
        {'name': 'Wireless Ergonomic Mouse', 'sku': 'MSE-E1', 'price': 45.00, 'stock': 150},
        {'name': 'Mechanical Keyboard', 'sku': 'KBD-M1', 'price': 85.00, 'stock': 80},
        {'name': '27-inch 4K Monitor', 'sku': 'MON-4K', 'price': 350.00, 'stock': 30},
        {'name': 'USB-C Docking Station', 'sku': 'DOC-C1', 'price': 120.00, 'stock': 60},
    ]

    created_products = []
    for p_data in products:
        product, created = Product.objects.get_or_create(
            sku=p_data['sku'],
            defaults={
                'name': p_data['name'],
                'price': p_data['price'],
                'current_stock': p_data['stock'],
                'description': f"Description for {p_data['name']}"
            }
        )
        created_products.append(product)
        if created:
            print(f"Created product: {product.name}")
        else:
            print(f"Product already exists: {product.name}")

    # Create Sales Data (Historical)
    # Generate sales for the last 60 days
    end_date = timezone.now()
    start_date = end_date - timedelta(days=60)
    
    for product in created_products:
        # Check if sales already exist to avoid duplication on re-run
        if Sale.objects.filter(product=product).exists():
            continue
            
        print(f"Generating sales for {product.name}...")
        current_date = start_date
        while current_date <= end_date:
            # Randomize daily sales
            # Trend: slightly more sales on weekends, maybe some random spikes
            is_weekend = current_date.weekday() >= 5
            base_sales = random.randint(0, 5)
            if is_weekend:
                base_sales += random.randint(1, 3)
            
            if base_sales > 0:
                Sale.objects.create(
                    product=product,
                    quantity=base_sales,
                    total_price=base_sales * product.price,
                    sale_date=current_date
                )
            current_date += timedelta(days=1)

    print("Seeding complete.")

if __name__ == '__main__':
    seed()
