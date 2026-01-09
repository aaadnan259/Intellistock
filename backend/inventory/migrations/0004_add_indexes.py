from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_alter_sale_sale_date'),
    ]

    operations = [
        # Product Indexes
        migrations.AddIndex(
             model_name='product',
             index=models.Index(fields=['sku'], name='inventory_p_sku_idx'), # sku is unique=True which already implies index, but user asked for it. 
             # Actually unique=True creates a unique index. Adding another is redundant unless it's covering. 
             # But request says "Product.sku (unique index) ... Create migration that adds indexes".
             # If it's already unique, I don't need to add it again.
             # I'll focus on others.
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['current_stock'], name='product_stock_idx'),
        ),
        # Sale Indexes
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['sale_date'], name='sale_date_idx'),
        ),
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['product', 'sale_date'], name='sale_prod_date_idx'),
        ),
    ]
