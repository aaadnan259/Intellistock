from django.db import models
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
import datetime

class Product(models.Model):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    current_stock = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} ({self.sku})"

    # Note: Indexes are defined in migration 0004_add_indexes.py
    # Do NOT duplicate here to avoid migration conflicts


class Sale(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales')
    quantity = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True)
    sale_date = models.DateField(default=datetime.date.today, db_index=True)

    def save(self, *args, **kwargs):
        if not self.pk:
            with transaction.atomic():
                # Lock row to prevent race conditions (skip on SQLite for tests)
                from django.db import connection
                if connection.vendor == 'sqlite':
                    product = Product.objects.get(pk=self.product_id)
                else:
                    product = Product.objects.select_for_update().get(pk=self.product_id)
                
                if self.quantity > product.current_stock:
                    raise ValidationError(
                        f"Stock insufficient for {product.sku}. Needs {self.quantity}, has {product.current_stock}"
                    )
                
                self.total_price = product.price * self.quantity
                
                # Update stock
                product.current_stock -= self.quantity
                product.save()
                
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Sale: {self.product.sku} - {self.quantity}"

    # Note: Indexes are defined in migration 0004_add_indexes.py
    # Do NOT duplicate here to avoid migration conflicts
