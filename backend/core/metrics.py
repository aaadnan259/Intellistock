"""
Prometheus metrics for Intellistock.

Exposes application metrics for monitoring and alerting.
"""
from prometheus_client import Counter, Histogram, Gauge, Info

# Application info
APP_INFO = Info("intellistock_app", "Application info")
APP_INFO.info({"version": "2.0.0", "environment": "production"})

# Request metrics
REQUEST_COUNT = Counter(
    "intellistock_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "intellistock_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

# Forecasting metrics
FORECAST_COUNT = Counter(
    "intellistock_forecasts_total",
    "Total forecasts generated",
    ["model_type", "status"],
)

FORECAST_DURATION = Histogram(
    "intellistock_forecast_duration_seconds",
    "Time to generate forecast",
    ["model_type"],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0],
)

FORECAST_ACCURACY = Gauge(
    "intellistock_forecast_accuracy",
    "Forecast accuracy metrics",
    ["product_id", "metric_type"],
)

# Inventory metrics
PRODUCT_COUNT = Gauge(
    "intellistock_products_total",
    "Total number of products",
)

LOW_STOCK_PRODUCTS = Gauge(
    "intellistock_low_stock_products",
    "Products with low stock",
)

STOCK_VALUE = Gauge(
    "intellistock_total_stock_value",
    "Total inventory value",
)

# Data validation metrics
VALIDATION_COUNT = Counter(
    "intellistock_validations_total",
    "Total data validations",
    ["status"],
)

VALIDATION_FAILURES = Counter(
    "intellistock_validation_failures_total",
    "Data validation failures",
    ["expectation_type"],
)

# Database metrics
DB_QUERY_COUNT = Counter(
    "intellistock_db_queries_total",
    "Total database queries",
    ["operation"],
)

DB_QUERY_DURATION = Histogram(
    "intellistock_db_query_duration_seconds",
    "Database query duration",
    ["operation"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)


# Helper functions to record metrics
def record_request(method: str, endpoint: str, status: int, duration: float) -> None:
    """Record HTTP request metrics."""
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=str(status)).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)


def record_forecast(model_type: str, duration: float, success: bool = True) -> None:
    """Record forecast generation metrics."""
    status = "success" if success else "error"
    FORECAST_COUNT.labels(model_type=model_type, status=status).inc()
    FORECAST_DURATION.labels(model_type=model_type).observe(duration)


def record_validation(success: bool, failed_expectations: list | None = None) -> None:
    """Record data validation metrics."""
    status = "success" if success else "failure"
    VALIDATION_COUNT.labels(status=status).inc()

    if failed_expectations:
        for exp in failed_expectations:
            exp_type = exp.get("expectation", "unknown")
            VALIDATION_FAILURES.labels(expectation_type=exp_type).inc()


def update_inventory_metrics(
    product_count: int, low_stock: int, total_value: float
) -> None:
    """Update inventory gauge metrics."""
    PRODUCT_COUNT.set(product_count)
    LOW_STOCK_PRODUCTS.set(low_stock)
    STOCK_VALUE.set(total_value)
