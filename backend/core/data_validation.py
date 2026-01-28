"""
Data validation using Great Expectations.

Validates sales data before it enters the forecasting pipeline.
Catches data quality issues early to prevent garbage-in-garbage-out.
"""
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of data validation."""

    success: bool
    statistics: Dict[str, Any]
    failed_expectations: List[Dict[str, Any]]
    warnings: List[str]

    def __bool__(self) -> bool:
        return self.success


class DataValidationError(Exception):
    """Raised when data validation fails."""

    pass


class SalesDataValidator:
    """
    Validates sales data for forecasting pipeline.

    Expectations:
    - Required columns exist (sale_date, quantity)
    - No null values in critical fields
    - Quantities are non-negative
    - Minimum data points for forecasting
    """

    def __init__(self, min_data_points: int = 30):
        self.min_data_points = min_data_points

    def validate(
        self, data: pd.DataFrame, product_id: Optional[int] = None
    ) -> ValidationResult:
        """
        Validate sales data.

        Args:
            data: DataFrame with sale_date/ds and quantity/y columns
            product_id: Optional product ID for context

        Returns:
            ValidationResult with success status and details
        """
        failed_expectations = []
        warnings = []

        # Normalize column names (support both ds/y and sale_date/quantity)
        df = data.copy()
        if "ds" in df.columns:
            df = df.rename(columns={"ds": "sale_date", "y": "quantity"})

        # 1. Check required columns
        required_cols = ["sale_date", "quantity"]
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            failed_expectations.append(
                {
                    "expectation": "expect_columns_to_exist",
                    "kwargs": {"columns": required_cols},
                    "observed_value": f"Missing: {missing_cols}",
                }
            )

        # 2. Check for null values in critical fields
        if "sale_date" in df.columns:
            null_dates = df["sale_date"].isnull().sum()
            if null_dates > 0:
                failed_expectations.append(
                    {
                        "expectation": "expect_column_values_to_not_be_null",
                        "kwargs": {"column": "sale_date"},
                        "observed_value": f"{null_dates} null values",
                    }
                )

        if "quantity" in df.columns:
            null_qty = df["quantity"].isnull().sum()
            if null_qty > 0:
                failed_expectations.append(
                    {
                        "expectation": "expect_column_values_to_not_be_null",
                        "kwargs": {"column": "quantity"},
                        "observed_value": f"{null_qty} null values",
                    }
                )

        # 3. Check quantities are non-negative
        if "quantity" in df.columns:
            negative_qty = (df["quantity"] < 0).sum()
            if negative_qty > 0:
                failed_expectations.append(
                    {
                        "expectation": "expect_column_values_to_be_between",
                        "kwargs": {"column": "quantity", "min_value": 0},
                        "observed_value": f"{negative_qty} negative values",
                    }
                )

        # 4. Check minimum row count
        if len(df) < self.min_data_points:
            failed_expectations.append(
                {
                    "expectation": "expect_table_row_count_to_be_between",
                    "kwargs": {"min_value": self.min_data_points},
                    "observed_value": f"{len(df)} rows",
                }
            )

        # Custom validations (warnings, not failures)
        custom_warnings = self._custom_validations(df)
        warnings.extend(custom_warnings)

        # Build statistics
        stats = self._build_statistics(df)

        return ValidationResult(
            success=len(failed_expectations) == 0,
            statistics=stats,
            failed_expectations=failed_expectations,
            warnings=warnings,
        )

    def _custom_validations(self, data: pd.DataFrame) -> List[str]:
        """Run custom validations that produce warnings."""
        warnings = []

        # Check for gaps in dates
        if "sale_date" in data.columns and len(data) > 1:
            try:
                dates = pd.to_datetime(data["sale_date"]).sort_values()
                gaps = dates.diff().dt.days
                large_gaps = (gaps > 7).sum()
                if large_gaps > 0:
                    warnings.append(
                        f"Found {large_gaps} gaps larger than 7 days in sales data"
                    )
            except Exception:
                pass

        # Check for outliers using IQR
        if "quantity" in data.columns and len(data) > 4:
            try:
                q1 = data["quantity"].quantile(0.25)
                q3 = data["quantity"].quantile(0.75)
                iqr = q3 - q1
                if iqr > 0:
                    outliers = data[
                        (data["quantity"] < q1 - 3 * iqr)
                        | (data["quantity"] > q3 + 3 * iqr)
                    ]
                    if len(outliers) > 0:
                        warnings.append(
                            f"Found {len(outliers)} extreme outliers (>3x IQR)"
                        )
            except Exception:
                pass

        # Check for zero-quantity days ratio
        if "quantity" in data.columns and len(data) > 0:
            zero_ratio = (data["quantity"] == 0).mean()
            if zero_ratio > 0.5:
                warnings.append(
                    f"High proportion of zero-quantity days ({zero_ratio:.1%})"
                )

        # Check data recency
        if "sale_date" in data.columns and len(data) > 0:
            try:
                latest = pd.to_datetime(data["sale_date"]).max()
                days_stale = (datetime.now() - latest).days
                if days_stale > 7:
                    warnings.append(
                        f"Data is {days_stale} days stale - forecast may be outdated"
                    )
            except Exception:
                pass

        return warnings

    def _build_statistics(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Build statistics about the data."""
        stats: Dict[str, Any] = {"row_count": len(data)}

        if "sale_date" in data.columns and len(data) > 0:
            try:
                dates = pd.to_datetime(data["sale_date"])
                stats["date_range"] = {
                    "min": str(dates.min().date()),
                    "max": str(dates.max().date()),
                }
            except Exception:
                stats["date_range"] = {"min": "unknown", "max": "unknown"}

        if "quantity" in data.columns and len(data) > 0:
            stats["quantity_stats"] = {
                "mean": float(data["quantity"].mean()),
                "std": float(data["quantity"].std()) if len(data) > 1 else 0,
                "min": float(data["quantity"].min()),
                "max": float(data["quantity"].max()),
            }

        stats["null_counts"] = data.isnull().sum().to_dict()

        return stats


def validate_sales_data(
    data: pd.DataFrame, product_id: Optional[int] = None, min_data_points: int = 30
) -> ValidationResult:
    """Validate sales data for forecasting."""
    validator = SalesDataValidator(min_data_points=min_data_points)
    return validator.validate(data, product_id)


def validate_before_forecast(
    data: pd.DataFrame, product_id: int, min_data_points: int = 14
) -> None:
    """
    Validate data and raise exception if invalid.

    Use this as a guard in the forecasting pipeline.
    """
    result = validate_sales_data(data, product_id, min_data_points=min_data_points)

    if not result.success:
        failed_list = ", ".join(e["expectation"] for e in result.failed_expectations)
        raise DataValidationError(
            f"Data validation failed for product {product_id}: {failed_list}"
        )

    # Log warnings but don't fail
    for warning in result.warnings:
        logger.warning(f"Product {product_id}: {warning}")
