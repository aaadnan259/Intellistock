import pandas as pd
import numpy as np
import logging
from sklearn.linear_model import LinearRegression
from inventory.models import Sale
from django.db.models import Sum
from datetime import timedelta, date

logger = logging.getLogger(__name__)

def run_forecast(product_id, days=1):
    """
    Generates a sales forecast for valid historical data.
    Aggregates in DB to avoid loading thousands of 'Sale' objects.
    """
    try:
        # DB Aggregation: Group by day, sum quantity
        sales_data = Sale.objects.filter(product_id=product_id)\
            .values('sale_date')\
            .annotate(qty=Sum('quantity'))\
            .order_by('sale_date')

        df = pd.DataFrame(list(sales_data))

        # Edge Case: Sparse Data
        if df.empty or len(df) < 5:
            logger.warning(f"Not enough data for product {product_id}. Using fallback.")
            if not df.empty:
                return float(df['qty'].mean())
            return 0.0

        # Processing
        df['sale_date'] = pd.to_datetime(df['sale_date'])
        df['date_ordinal'] = df['sale_date'].apply(lambda x: x.toordinal())

        X = df[['date_ordinal']]
        y = df['qty']

        model = LinearRegression()
        model.fit(X, y)

        # Predict Future
        target_date = date.today() + timedelta(days=days)
        prediction = model.predict(np.array([[target_date.toordinal()]]))
        
        return max(0.0, float(prediction[0]))

    except Exception as e:
        logger.error(f"Forecast failed for {product_id}: {e}")
        # Fail safe, don't crash the request
        return 0.0
