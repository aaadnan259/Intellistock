import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from inventory.models import Sale, Product

print(f"Deleting {Sale.objects.count()} sales...")
Sale.objects.all().delete()
print("Resetting stock...")
Product.objects.all().update(current_stock=500)
print("Done.")
