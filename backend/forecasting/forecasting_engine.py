import pandas as pd
import numpy as np
from datetime import timedelta
from django.db.models import Sum
from inventory.models import Sale, Product
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score
from sklearn.linear_model import LinearRegression
import logging
import warnings

# Suppress Prophet logs and warnings
logging.getLogger('cmdstanpy').setLevel(logging.ERROR)
warnings.filterwarnings("ignore")

class ForecastingEngine:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def _get_sales_df(self, product_id):
        """Helper to fetch and aggregate sales data using DB aggregation for performance"""
        from django.db.models.functions import TruncDate
        
        # Optimize: Aggregate at DB level to avoid loading millions of rows
        sales_data = Sale.objects.filter(product_id=product_id)\
            .annotate(date=TruncDate('sale_date'))\
            .values('date')\
            .annotate(y=Sum('quantity'))\
            .order_by('date')
            
        if not sales_data.exists():
            return None
        
        df = pd.DataFrame(list(sales_data))
        # Rename date to ds for Prophet
        df.rename(columns={'date': 'ds'}, inplace=True)
        
        # Ensure regex/types
        df['ds'] = pd.to_datetime(df['ds'])
        df = df.set_index('ds')
        
        # Fill missing dates
        if not df.empty:
            idx = pd.date_range(start=df.index.min(), end=df.index.max(), freq='D')
            df = df.reindex(idx, fill_value=0)
            df = df.reset_index().rename(columns={'index': 'ds'})
            
        return df

    def analyze_product_data(self, product_id):
        df = self._get_sales_df(product_id)
        if df is None or len(df) < 14: # Min 2 weeks data
            return None

        y = df['y'].values
        
        # 1. Sales Volume
        total_sales = np.sum(y)
        avg_daily_sales = np.mean(y)

        # 2. Variability (CV)
        cv = np.std(y) / avg_daily_sales if avg_daily_sales > 0 else 0

        # 3. Trend (Slope)
        X = np.arange(len(y)).reshape(-1, 1)
        model = LinearRegression()
        model.fit(X, y)
        trend_slope = model.coef_[0]

        # 4. Seasonality Score (Simple weekly variance check)
        # Compare variance of daily means vs total variance
        df['weekday'] = df['ds'].dt.weekday
        weekly_means = df.groupby('weekday')['y'].mean()
        seasonality_score = np.std(weekly_means) / np.mean(weekly_means) if np.mean(weekly_means) > 0 else 0

        return {
            'total_sales': int(total_sales),
            'avg_daily': float(avg_daily_sales),
            'cv': float(cv),
            'trend': float(trend_slope),
            'seasonality': float(seasonality_score),
            'days_count': len(df)
        }

    def select_best_model(self, characteristics):
        if not characteristics:
            return 'ensemble', 'Insufficient data'

        cv = characteristics['cv']
        seasonality = characteristics['seasonality']
        trend = characteristics['trend']

        if seasonality > 0.3:
            return 'prophet', 'High seasonality detected'
        
        if cv < 0.5 and abs(trend) > 0.01:
            return 'arima', 'Clear trend with low variability'
        
        if cv > 1.0:
            return 'exponential', 'High variability/Erratic demand' # Holt-Winters handles level adjustments well

        return 'ensemble', 'Balanced characteristics'


    def forecast_prophet(self, df, days=30):
        try:
            m = Prophet(daily_seasonality=True, yearly_seasonality=len(df)>365)
            m.fit(df)
            future = m.make_future_dataframe(periods=days)
            forecast = m.predict(future)
            
            # Extract last 'days' entries
            result = forecast.tail(days)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
            
            output = []
            for _, row in result.iterrows():
                output.append({
                    'date': row['ds'].date(),
                    'value': max(0, row['yhat']), # No negative sales
                    'lower': max(0, row['yhat_lower']),
                    'upper': max(0, row['yhat_upper'])
                })
            return output
        except Exception as e:
            self.logger.error(f"Prophet error: {str(e)}")
            return []

    def forecast_arima(self, df, days=30):
        try:
            # Simple grid search for (p, d, q) based on AIC
            best_aic = float('inf')
            best_order = (1, 1, 1)
            
            # Limit grid for performance
            train_data = df['y'].values
            
            # Quick check if data is non-stationary (simple check)
            # Just defaulting to d=1 for robustness in MVP
            
            for p in range(3):
                for q in range(3):
                    try:
                        model = ARIMA(train_data, order=(p, 1, q))
                        res = model.fit()
                        if res.aic < best_aic:
                            best_aic = res.aic
                            best_order = (p, 1, q)
                    except:
                        continue
            
            model = ARIMA(train_data, order=best_order)
            res = model.fit()
            forecast_res = res.get_forecast(steps=days)
            predicted = forecast_res.predicted_mean
            conf_int = forecast_res.conf_int(alpha=0.2) # 80% confidence
            
            last_date = df['ds'].iloc[-1]
            output = []
            for i in range(days):
                date = last_date + timedelta(days=i+1)
                output.append({
                    'date': date.date(),
                    'value': max(0, predicted[i]),
                    'lower': max(0, conf_int[i][0]),
                    'upper': max(0, conf_int[i][1])
                })
            return output
        except Exception as e:
            self.logger.error(f"ARIMA error: {str(e)}")
            return []

    def forecast_exponential_smoothing(self, df, days=30):
        try:
            # Holt-Winters 'add' trend and seasonality if enough data
            seasonal_periods = 7
            trend = 'add'
            seasonal = 'add' if len(df) > 14 else None
            
            model = ExponentialSmoothing(
                df['y'].values, 
                seasonal_periods=seasonal_periods,
                trend=trend,
                seasonal=seasonal,
                initialization_method="estimated"
            ).fit()
            
            pred = model.forecast(days)
            
            # CI estimation for ES is harder manually, we'll estimate using residual std dev
            residuals = df['y'].values - model.fittedvalues
            std_resid = np.std(residuals)
            
            last_date = df['ds'].iloc[-1]
            output = []
            for i in range(days):
                date = last_date + timedelta(days=i+1)
                value = max(0, pred[i])
                # Simple 80% CI estimation (+- 1.28 sigma)
                output.append({
                    'date': date.date(),
                    'value': value,
                    'lower': max(0, value - 1.28 * std_resid),
                    'upper': max(0, value + 1.28 * std_resid)
                })
            return output

        except Exception as e:
            self.logger.error(f"Exponential Smoothing error: {str(e)}")
            return []

    def forecast_ensemble(self, df, days=30):
        # Run all 3
        p_res = self.forecast_prophet(df, days)
        a_res = self.forecast_arima(df, days)
        e_res = self.forecast_exponential_smoothing(df, days)
        
        # Combine results by date
        combined = {}
        for r in p_res + a_res + e_res:
            d = r['date']
            if d not in combined:
                combined[d] = {'values': [], 'lowers': [], 'uppers': []}
            combined[d]['values'].append(r['value'])
            combined[d]['lowers'].append(r['lower'])
            combined[d]['uppers'].append(r['upper'])
            
        output = []
        full_dates = sorted(combined.keys())
        for d in full_dates:
            vals = combined[d]['values']
            lows = combined[d]['lowers']
            ups = combined[d]['uppers']
            
            if not vals: continue
            
            output.append({
                'date': d,
                'value': sum(vals) / len(vals),
                'lower': sum(lows) / len(lows),
                'upper': sum(ups) / len(ups)
            })
            
        return output

    def calculate_accuracy_metrics(self, actual, predicted):
        if len(actual) < 2 or len(predicted) < 2:
            return {'r2': 0, 'mae': 0, 'mape': 0}
        
        # Ensure lengths match
        min_len = min(len(actual), len(predicted))
        y_true = actual[:min_len]
        y_pred = predicted[:min_len]
        
        return {
            'r2': r2_score(y_true, y_pred),
            'mae': mean_absolute_error(y_true, y_pred),
            'mape': mean_absolute_percentage_error(y_true, y_pred)
        }

    def generate_forecast(self, product_id, days=30, model_type='auto'):
        df = self._get_sales_df(product_id)
        if df is None:
            return {'error': 'Insufficient data'}
        
        # Split for validation if needed, but for future forecast we train on all
        # To get metrics, we usually backtest. For MVP, we'll train on all and just return forecast
        # UNLESS we need metrics returned to API. 
        # Let's do a simple 80/20 split backtest calculate metrics, THEN retrain on all for future.
        
        train_size = int(len(df) * 0.8)
        train_df = df.iloc[:train_size]
        test_df = df.iloc[train_size:]
        
        # Determine model
        if model_type == 'auto':
            chars = self.analyze_product_data(product_id)
            model_type, reason = self.select_best_model(chars)
        else:
            reason = "User selection"
            
        # 1. Backtest for accuracy metrics
        if model_type == 'prophet':
            bt_res = self.forecast_prophet(train_df, days=len(test_df))
        elif model_type == 'arima':
            bt_res = self.forecast_arima(train_df, days=len(test_df))
        elif model_type == 'exponential':
            bt_res = self.forecast_exponential_smoothing(train_df, days=len(test_df))
        else: # ensemble
            bt_res = self.forecast_ensemble(train_df, days=len(test_df))
            
        bt_values = [x['value'] for x in bt_res]
        metrics = self.calculate_accuracy_metrics(test_df['y'].values, bt_values)
        
        # 2. Final Forecast
        if model_type == 'prophet':
            final_res = self.forecast_prophet(df, days)
        elif model_type == 'arima':
            final_res = self.forecast_arima(df, days)
        elif model_type == 'exponential':
            final_res = self.forecast_exponential_smoothing(df, days)
        else:
            final_res = self.forecast_ensemble(df, days)
            
        return {
            'forecast': final_res,
            'metrics': metrics,
            'model_used': model_type,
            'reason': reason
        }
