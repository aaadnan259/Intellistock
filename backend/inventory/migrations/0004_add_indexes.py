from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_alter_sale_sale_date'),
    ]

    operations = [
        # Product Indexes
        # Note: sku already has unique=True which creates a unique index automatically
        # Only add the stock index for filtering low stock items
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['current_stock'], name='product_stock_idx'),
        ),
        
        # Sale Indexes - Critical for forecast queries
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['sale_date'], name='sale_date_idx'),
        ),
        
        # Composite index for common query pattern: filter by product, order by date
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['product', 'sale_date'], name='sale_prod_date_idx'),
        ),
        
        # Index for aggregation queries (sum by date range)
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['sale_date', 'quantity'], name='sale_date_qty_idx'),
        ),
    ]
