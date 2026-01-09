import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from inventory.models import Product, Sale

def seed_realistic():
    print("Clean slate...")
    Sale.objects.all().delete()
    Product.objects.all().delete()
    
    categories = {
        'Electronics': {'margin': 1.4, 'volatility': 'med', 'season': [11, 12]}, # Nov/Dec peak
        'Apparel': {'margin': 2.5, 'volatility': 'high', 'season': [6, 7, 12]}, # Summer/Winter
        'Food': {'margin': 1.2, 'volatility': 'low', 'season': []},
        'Furniture': {'margin': 3.0, 'volatility': 'low', 'season': [5, 8]},
        'Stationery': {'margin': 1.8, 'volatility': 'low', 'season': [8, 9]} # Back to school
    }
    
    products_db = []
    
    # 1. Create Products (50 items)
    print("Creating products...")
    counter = 1
    for cat, traits in categories.items():
        for i in range(10):
            base_cost = random.randint(10, 500)
            if cat == 'Food': base_cost = random.randint(2, 20)
            if cat == 'Furniture': base_cost = random.randint(100, 2000)
            
            price = round(base_cost * traits['margin'], 2)
            name = f"{cat} Item {i+1} - {random.choice(['Pro', 'Max', 'Lite', 'Standard', 'Premium'])}"
            sku = f"{cat[:3].upper()}-{counter:03d}"
            
            p = Product.objects.create(
                name=name,
                sku=sku,
                price=price,
                current_stock=random.randint(0, 500) # Some out of stock
            )
            products_db.append({'p': p, 'cat': cat})
            counter += 1

    # 2. Generate History (1 year)
    print("Generating sales history...")
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=365)
    
    sales_batch = []
    
    for item in products_db:
        prod = item['p']
        cat = item['cat']
        traits = categories[cat]
        
        # Determine average daily sales base
        avg_sales = random.randint(1, 20)
        if cat == 'Food': avg_sales = random.randint(20, 100)
        if cat == 'Furniture': avg_sales = random.randint(0, 3) # Slow mover
        
        # Slow mover simulation: 10% of products
        is_slow = random.random() < 0.1
        if is_slow: avg_sales = 0
        
        for d in range(365):
            date = start_date + timedelta(days=d)
            
            # Base demand
            if is_slow:
                 if random.random() > 0.98: # Rare sale
                     qty = random.randint(1, 2)
                 else:
                     continue
            else:
                # Seasonality
                multiplier = 1.0
                if date.month in traits['season']:
                    multiplier = 1.5 + random.random() # Peak
                
                # Weekend boost
                if date.weekday() >= 5: # Sat/Sun
                    if cat in ['Food', 'Apparel']:
                        multiplier *= 1.3
                    elif cat == 'Stationery': # Office closed
                        multiplier *= 0.8
                
                # Noise
                noise = random.uniform(0.7, 1.3)
                
                qty = int(avg_sales * multiplier * noise)
                
            if qty > 0:
                sales_batch.append(Sale(
                    product=prod,
                    quantity=qty,
                    total_price=round(qty * float(prod.price), 2),
                    sale_date=date
                ))
                
            # Batch insert to save memory
            if len(sales_batch) > 5000:
                Sale.objects.bulk_create(sales_batch)
                sales_batch = []
                
    if sales_batch:
        Sale.objects.bulk_create(sales_batch)
        
    print(f"Seeding complete. {Product.objects.count()} products, Sales generated.")

if __name__ == "__main__":
    try:
        seed_realistic()
    except Exception as e:
        print(f"Error: {e}")
