from django.db import models
from inventory.models import Product

class ForecastResult(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='forecasts')
    forecast_date = models.DateField()
    predicted_value = models.FloatField()
    confidence_lower = models.FloatField()
    confidence_upper = models.FloatField()
    model_used = models.CharField(max_length=50)
    accuracy_score = models.FloatField(null=True, blank=True)  # R² when actuals available
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-forecast_date']
        indexes = [
            models.Index(fields=['product', 'forecast_date']),
        ]

    def __str__(self):
        return f"{self.product.sku} - {self.forecast_date} ({self.model_used})"

class ModelAccuracy(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='model_metrics')
    model_name = models.CharField(max_length=50)
    r2_score = models.FloatField()
    mae = models.FloatField()
    mape = models.FloatField()
    sample_size = models.IntegerField()
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'model_name')

    def __str__(self):
        return f"{self.product.sku} - {self.model_name}: R2={self.r2_score:.2f}"
