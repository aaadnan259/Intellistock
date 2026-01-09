# Intellistock API Documentation

## Authentication
All endpoints require standard Authentication (Session or Token).

## Forecasting Endpoints

### 1. Generate Single Forecast
**POST** `/api/forecasting/advanced-predict/`

Triggers an on-demand forecast for a specific product.

**Request Body:**
```json
{
    "product_id": 1,
    "days": 30,
    "model": "auto"  // Options: "auto", "prophet", "arima", "exponential", "ensemble"
}
```

**Response:**
```json
{
    "forecast": [
        { "date": "2024-01-01", "value": 15.5, "lower": 12.0, "upper": 18.0 },
        ...
    ],
    "metrics": {
        "r2": 0.89,
        "mae": 2.1,
        "mape": 0.12
    },
    "model_used": "prophet"
}
```

### 2. Batch Forecast Status
**GET** `/api/forecasting/batch-status/`

Returns the status of background forecasting tasks.

**Response:**
```json
{
    "task_id": "uuid...",
    "status": "PROCESSING",
    "progress": 45
}
```

## Analytics Endpoints

### 1. ABC Analysis
**GET** `/api/inventory/analytics/abc-analysis/`

Returns products classified by value contribution.

**Response:**
```json
{
    "a_items": [{ "product_id": 1, "name": "Laptop", "value": 50000, "percentile": 0.01 }, ...],
    "b_items": [...],
    "c_items": [...],
    "summary": { "a_count": 50, "b_count": 150, "c_count": 800 }
}
```

### 2. Slow Movers
**GET** `/api/inventory/analytics/slow-movers/?threshold=60`

Returns products with no sales for `threshold` days.

**Response:**
```json
[
    {
        "product_id": 55,
        "name": "Old Monitor",
        "days_no_sale": 95,
        "recommended_action": "Markdown 30-50%"
    }
]
```

### 3. Sales Trends
**GET** `/api/inventory/analytics/sales-trends/?days=90`

Returns daily sales history and trend analysis.

**Response:**
```json
{
    "dates": ["2023-10-01", ...],
    "daily_sales": [100, 150, ...],
    "moving_average": [110, 115, ...],
    "trend": "increasing",
    "trend_slope": 1.5
}
```
