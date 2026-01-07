import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from inventory.models import Sale
from django.db.models import Sum
from datetime import timedelta, date

def predict_sales(product_id):
    """
    Predicts sales for the next day using Linear Regression.
    Aggregation is done at the DB level to avoid pulling all records.
    """
    try:
        # 1. Fetch data: Group by date, sum quantity
        # DB Optimization: Never use .all() for analytics
        sales_data = Sale.objects.filter(product_id=product_id)\
            .values('sale_date')\
            .annotate(qty=Sum('quantity'))\
            .order_by('sale_date')

        # 2. Convert to DataFrame
        df = pd.DataFrame(list(sales_data))

        # 3. Validation / Edge Cases
        if df.empty or len(df) < 2:
            # Not enough data for regression, return basic average or 0
            if not df.empty:
                return float(df['qty'].mean())
            return 0.0

        # 4. Preprocessing
        df['sale_date'] = pd.to_datetime(df['sale_date'])
        # Convert dates to ordinal for regression
        df['date_ordinal'] = df['sale_date'].apply(lambda x: x.toordinal())

        X = df[['date_ordinal']]
        y = df['qty']

        # 5. Model Training
        model = LinearRegression()
        model.fit(X, y)

        # 6. Predict for tomorrow
        tomorrow = date.today() + timedelta(days=1)
        tomorrow_ordinal = np.array([[tomorrow.toordinal()]])
        
        prediction = model.predict(tomorrow_ordinal)
        
        # Ensure non-negative
        return max(0.0, float(prediction[0]))

    except Exception as e:
        # Fallback to prevent crash
        print(f"Prediction Error for product {product_id}: {e}")
        return 0.0
