import pandas as pd
import numpy as np
import logging
from sklearn.linear_model import LinearRegression
from inventory.models import Sale
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta

# Production logging
logger = logging.getLogger(__name__)

def run_forecast(product_id: int, days: int = 1) -> int:
    """
    Generates a sales forecast for the next 'days'.
    Returns an integer (unit sales).
    """
    try:
        # Validate/Cast input
        if not isinstance(product_id, int):
            raise ValueError(f"Invalid product_id: {product_id}")

        # DB Aggregation: Group by day, sum quantity
        sales_data = Sale.objects.filter(product_id=product_id)\
            .values('sale_date')\
            .annotate(qty=Sum('quantity'))\
            .order_by('sale_date')

        # Memory Optimization: Use from_records/iterator if needed, 
        # but for aggregation results (1 row per day), simple list is fine.
        # However, following audit advice for correctness:
        df = pd.DataFrame.from_records(sales_data)

        # Edge Case: Sparse Data
        if df.empty or len(df) < 5:
            logger.warning(f"Insufficient data for product_id={product_id}. Using fallback.")
            if not df.empty:
                return int(df['qty'].mean())
            return 0

        # Processing
        df['sale_date'] = pd.to_datetime(df['sale_date'])
        df['date_ordinal'] = df['sale_date'].apply(lambda x: x.toordinal())

        X = df[['date_ordinal']]
        y = df['qty']

        model = LinearRegression()
        model.fit(X, y)

        # Predict Future with Timezone Awareness
        # Note: toordinal() is naive, but we consistently use it for regression.
        # We ensure 'target_date' is based on server now.
        target_date = timezone.now().date() + timedelta(days=days)
        prediction = model.predict(np.array([[target_date.toordinal()]]))
        
        # Return strict Int
        return max(0, int(prediction[0]))

    except Exception as e:
        logger.error(f"Forecast failed for product_id={product_id}: {str(e)}", exc_info=True)
        return 0
