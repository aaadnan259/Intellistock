from django.db import models
from django.core.exceptions import ValidationError

class Product(models.Model):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    current_stock = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} ({self.sku})"

class Sale(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales')
    quantity = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True)
    sale_date = models.DateField(auto_now_add=True, db_index=True)

    def save(self, *args, **kwargs):
        if not self.pk: # Only on creation
            if self.quantity > self.product.current_stock:
                raise ValidationError(f"Insufficient stock for product {self.product.sku}. Requested: {self.quantity}, Available: {self.product.current_stock}")
            
            # Calculate total price
            self.total_price = self.product.price * self.quantity
            
            # Decrement stock
            self.product.current_stock -= self.quantity
            self.product.save()
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Sale: {self.product.sku} - {self.quantity} items"
