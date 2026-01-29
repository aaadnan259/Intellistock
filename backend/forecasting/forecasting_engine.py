"""
Core forecasting logic.

The main idea: instead of forcing users to pick a model, we analyze the data
and pick for them. Seasonal patterns? Prophet. Clear trend? ARIMA. Noisy mess?
Exponential smoothing or ensemble.

This isn't perfect—sometimes the "wrong" model wins on backtest metrics—but
it's better than making users guess.
"""

import pandas as pd
import numpy as np
from datetime import timedelta
from django.db.models import Sum
from inventory.models import Sale
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.metrics import (
    mean_absolute_error,
    mean_absolute_percentage_error,
    r2_score,
)
from sklearn.linear_model import LinearRegression
from config.forecasting_config import forecasting_config as config
from forecasting.mlflow_tracking import (
    track_forecast_run,
    log_forecast_params,
    log_forecast_metrics,
    log_data_characteristics,
)
from core.data_validation import validate_before_forecast, DataValidationError
import logging
import warnings

# Suppress Prophet logs and warnings
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
warnings.filterwarnings("ignore")


class ForecastingEngine:
    """
    Generates demand forecasts with automatic model selection.

    Usage:
        engine = ForecastingEngine()
        result = engine.generate_forecast(product_id=42, days=30)

    The result includes the forecast, confidence intervals, backtest metrics,
    and which model was selected (and why).
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def _get_sales_df(self, product_id):
        """Fetch and aggregate sales data using DB aggregation for perf."""
        from django.db import connection
        from django.db.models.functions import TruncDate

        if connection.vendor == "sqlite":
            sales_qs = Sale.objects.filter(product_id=product_id).values(
                "sale_date",
                "quantity",
            )
            if not sales_qs.exists():
                return None

            df = pd.DataFrame(list(sales_qs))
            df["ds"] = pd.to_datetime(df["sale_date"]).dt.normalize()
            df = df.groupby("ds", as_index=False)["quantity"].sum()
            df.rename(columns={"quantity": "y"}, inplace=True)
        else:
            # Optimize: Aggregate at DB level to avoid loading millions of rows
            sales_data = (
                Sale.objects.filter(product_id=product_id)
                .annotate(date=TruncDate("sale_date"))
                .values("date")
                .annotate(y=Sum("quantity"))
                .order_by("date")
            )

            if not sales_data.exists():
                return None

            df = pd.DataFrame(list(sales_data))
            # Rename date to ds for Prophet
            df.rename(columns={"date": "ds"}, inplace=True)

        # Ensure regex/types
        df["ds"] = pd.to_datetime(df["ds"])
        df = df.set_index("ds")

        # Fill missing dates
        if not df.empty:
            idx = pd.date_range(start=df.index.min(), end=df.index.max(), freq="D")
            df = df.reindex(idx, fill_value=0)
            df = df.reset_index().rename(columns={"index": "ds"})

        return df

    def analyze_product_data(self, product_id):
        """
        Compute stats that help us pick a model:
        - seasonality: autocorrelation at lag 7 (weekly pattern)
        - cv: coefficient of variation (how noisy is it?)
        - trend: normalized slope (growing? shrinking? flat?)

        These thresholds were tuned by trial and error on ~50 product histories.
        They're not magic numbers, just what worked reasonably well.
        """
        df = self._get_sales_df(product_id)
        if df is None or len(df) < config.min_data_points:
            return None

        y = df["y"].values

        # 1. Sales Volume
        total_sales = np.sum(y)
        avg_daily_sales = np.mean(y)

        # 2. Variability (CV)
        # CV = std/mean. High CV = noisy data.
        cv = np.std(y) / avg_daily_sales if avg_daily_sales > 0 else 0

        # 3. Trend (Slope)
        X = np.arange(len(y)).reshape(-1, 1)
        model = LinearRegression()
        model.fit(X, y)
        trend_slope = model.coef_[0]

        # 4. Seasonality Score (Simple weekly variance check)
        # Compare variance of daily means vs total variance
        df["weekday"] = df["ds"].dt.weekday
        weekly_means = df.groupby("weekday")["y"].mean()
        seasonality_score = (
            np.std(weekly_means) / np.mean(weekly_means)
            if np.mean(weekly_means) > 0
            else 0
        )

        return {
            "total_sales": int(total_sales),
            "avg_daily": float(avg_daily_sales),
            "cv": float(cv),
            "trend": float(trend_slope),
            "seasonality": float(seasonality_score),
            "days_count": len(df),
        }

    def select_best_model(self, characteristics):
        """
        Decision tree for model selection. Pretty simple:

        1. Strong weekly/yearly pattern? → Prophet (it's built for this)
        2. Clear trend + low noise? → ARIMA (handles trends well)
        3. Super noisy? → Exponential Smoothing (smooths out the chaos)
        4. Can't tell? → Ensemble (hedge our bets)

        The thresholds (0.3, 0.5, 1.0) came from experimenting with
        our test dataset. Your mileage may vary.
        """
        if not characteristics:
            return "ensemble", "Insufficient data"

        cv = characteristics["cv"]
        seasonality = characteristics["seasonality"]
        trend = characteristics["trend"]

        if seasonality > config.seasonality_threshold:
            return "prophet", "High seasonality detected"

        if cv < config.cv_low_threshold and abs(trend) > config.trend_threshold:
            return "arima", "Clear trend with low variability"

        if cv > config.cv_high_threshold:
            return (
                "exponential",
                "High variability/Erratic demand",
            )

        return "ensemble", "Balanced characteristics"

    def forecast_prophet(self, df, days=30):
        try:
            m = Prophet(
                daily_seasonality=config.prophet_daily_seasonality,
                yearly_seasonality=len(df)
                > config.prophet_yearly_seasonality_threshold,
            )
            m.fit(df)
            future = m.make_future_dataframe(periods=days)
            forecast = m.predict(future)

            # Extract last 'days' entries
            result = forecast.tail(days)[["ds", "yhat", "yhat_lower", "yhat_upper"]]

            output = []
            for _, row in result.iterrows():
                output.append(
                    {
                        "date": row["ds"].date(),
                        "value": max(0, row["yhat"]),  # No negative sales
                        "lower": max(0, row["yhat_lower"]),
                        "upper": max(0, row["yhat_upper"]),
                    }
                )
            return output
        except Exception as e:
            self.logger.error(f"Prophet error: {str(e)}")
            return []

    def forecast_arima(self, df, days=30):
        try:
            # Simple grid search for (p, d, q) based on AIC
            best_aic = float("inf")
            best_order = (1, 1, 1)

            # Limit grid for performance
            train_data = df["y"].values

            # Quick check if data is non-stationary (simple check)
            # Just defaulting to d=1 for robustness in MVP

            for p in range(config.arima_p_range):
                for q in range(config.arima_q_range):
                    try:
                        model = ARIMA(train_data, order=(p, config.arima_d, q))
                        res = model.fit()
                        if res.aic < best_aic:
                            best_aic = res.aic
                            best_order = (p, config.arima_d, q)
                    except Exception:
                        continue

            model = ARIMA(train_data, order=best_order)
            res = model.fit()
            forecast_res = res.get_forecast(steps=days)
            predicted = forecast_res.predicted_mean
            conf_int = forecast_res.conf_int(alpha=config.arima_confidence_alpha)

            last_date = df["ds"].iloc[-1]
            output = []
            for i in range(days):
                date = last_date + timedelta(days=i + 1)
                output.append(
                    {
                        "date": date.date(),
                        "value": max(0, predicted[i]),
                        "lower": max(0, conf_int[i][0]),
                        "upper": max(0, conf_int[i][1]),
                    }
                )
            return output
        except Exception as e:
            self.logger.error(f"ARIMA error: {str(e)}")
            return []

    def forecast_exponential_smoothing(self, df, days=30):
        try:
            seasonal_periods = config.es_seasonal_periods
            trend = config.es_trend
            seasonal = "add" if len(df) > config.min_data_points else None

            model = ExponentialSmoothing(
                df["y"].values,
                seasonal_periods=seasonal_periods,
                trend=trend,
                seasonal=seasonal,
                initialization_method="estimated",
            ).fit()

            pred = model.forecast(days)

            # CI estimation for ES is harder manually, estimate via residual std
            residuals = df["y"].values - model.fittedvalues
            std_resid = np.std(residuals)

            last_date = df["ds"].iloc[-1]
            output = []
            for i in range(days):
                date = last_date + timedelta(days=i + 1)
                value = max(0, pred[i])
                output.append(
                    {
                        "date": date.date(),
                        "value": value,
                        "lower": max(0, value - config.es_confidence_z * std_resid),
                        "upper": max(0, value + config.es_confidence_z * std_resid),
                    }
                )
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
            d = r["date"]
            if d not in combined:
                combined[d] = {"values": [], "lowers": [], "uppers": []}
            combined[d]["values"].append(r["value"])
            combined[d]["lowers"].append(r["lower"])
            combined[d]["uppers"].append(r["upper"])

        output = []
        full_dates = sorted(combined.keys())
        for d in full_dates:
            vals = combined[d]["values"]
            lows = combined[d]["lowers"]
            ups = combined[d]["uppers"]

            if not vals:
                continue

            output.append(
                {
                    "date": d,
                    "value": sum(vals) / len(vals),
                    "lower": sum(lows) / len(lows),
                    "upper": sum(ups) / len(ups),
                }
            )

        return output

    def calculate_accuracy_metrics(self, actual, predicted):
        if len(actual) < 2 or len(predicted) < 2:
            return {"r2": 0, "mae": 0, "mape": 0}

        # Ensure lengths match
        min_len = min(len(actual), len(predicted))
        y_true = actual[:min_len]
        y_pred = predicted[:min_len]

        return {
            "r2": r2_score(y_true, y_pred),
            "mae": mean_absolute_error(y_true, y_pred),
            "mape": mean_absolute_percentage_error(y_true, y_pred),
        }

    def generate_forecast(self, product_id, days=30, model_type="auto"):
        """
        Main entry point. Gets historical data, picks a model, trains it,
        and generates predictions.

        model_override lets you force a specific model ("prophet", "arima", etc.)
        if you want to compare or know something we don't.
        """
        df = self._get_sales_df(product_id)
        if df is None:
            return {"error": "Insufficient data"}

        # Validate data before proceeding
        try:
            validate_before_forecast(
                df, product_id, min_data_points=config.min_data_points
            )
        except DataValidationError as e:
            return {"error": str(e)}

        # Split for validation if needed, but for future forecast we train on all
        # To get metrics, we usually backtest. For MVP, train on all data.
        # UNLESS we need metrics returned to API.
        # Simple 80/20 split backtest, calculate metrics, then retrain on all.

        train_size = int(len(df) * config.validation_split)
        train_df = df.iloc[:train_size]
        test_df = df.iloc[train_size:]

        # Determine model
        if model_type == "auto":
            chars = self.analyze_product_data(product_id)
            model_type, reason = self.select_best_model(chars)
        else:
            chars = self.analyze_product_data(product_id)
            reason = "User selection"

        # MLflow tracking context
        with track_forecast_run(product_id=product_id, model_type=model_type) as run:
            # Log forecast parameters
            log_forecast_params(
                {
                    "forecast_days": days,
                    "model_selection": (
                        "auto" if reason != "User selection" else "manual"
                    ),
                    "validation_split": config.validation_split,
                    "train_size": train_size,
                    "test_size": len(test_df),
                }
            )

            # Log data characteristics if available
            if chars:
                log_data_characteristics(
                    seasonality_score=chars.get("seasonality", 0),
                    coefficient_of_variation=chars.get("cv", 0),
                    trend_strength=chars.get("trend", 0),
                    n_observations=chars.get("days_count", len(df)),
                )

            # 1. Backtest for accuracy metrics
            if model_type == "prophet":
                bt_res = self.forecast_prophet(train_df, days=len(test_df))
            elif model_type == "arima":
                bt_res = self.forecast_arima(train_df, days=len(test_df))
            elif model_type == "exponential":
                bt_res = self.forecast_exponential_smoothing(
                    train_df, days=len(test_df)
                )
            else:  # ensemble
                bt_res = self.forecast_ensemble(train_df, days=len(test_df))

            bt_values = [x["value"] for x in bt_res]
            metrics = self.calculate_accuracy_metrics(test_df["y"].values, bt_values)

            # Log backtest metrics to MLflow
            log_forecast_metrics(
                {
                    "mae": metrics.get("mae", 0),
                    "mape": metrics.get("mape", 0),
                    "r2": metrics.get("r2", 0),
                }
            )

            # 2. Final Forecast
            if model_type == "prophet":
                final_res = self.forecast_prophet(df, days)
            elif model_type == "arima":
                final_res = self.forecast_arima(df, days)
            elif model_type == "exponential":
                final_res = self.forecast_exponential_smoothing(df, days)
            else:
                final_res = self.forecast_ensemble(df, days)

            # Log forecast summary metrics
            if final_res:
                forecast_values = [x["value"] for x in final_res]
                log_forecast_metrics(
                    {
                        "forecast_mean": float(np.mean(forecast_values)),
                        "forecast_std": float(np.std(forecast_values)),
                    }
                )

            mlflow_run_id = run.info.run_id if run else None

        return {
            "forecast": final_res,
            "metrics": metrics,
            "model_used": model_type,
            "reason": reason,
            "mlflow_run_id": mlflow_run_id,
        }
