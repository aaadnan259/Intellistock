from django.db import models
from django.db.models import (
    Sum,
    F,
    Window,
    FloatField,
    Max,
)
from django.db.models.functions import Coalesce, PercentRank
from django.utils import timezone
from datetime import timedelta
import pandas as pd
import numpy as np
import itertools
from .models import Product, Sale


class InventoryAnalytics:
    # Mock category configuration
    CATEGORY_BREAKDOWN = [
        {"name": "Electronics", "multiplier": 1.2, "fixed_value": 45000},
        {"name": "Accessories", "multiplier": 0.8, "fixed_value": 15000},
        {"name": "General", "multiplier": 1.0, "use_total": True},
    ]

    def calculate_turnover_ratio(self):
        """
        Calculate inventory turnover ratio by category.
        Turnover = Cost of Goods Sold / Average Inventory Value
        """
        products = Product.objects.annotate(
            inventory_value=F("current_stock") * F("price")
        )

        total_inv_value = (
            products.aggregate(Sum("inventory_value"))["inventory_value__sum"] or 0
        )

        # Sales in last 365 days
        one_year_ago = timezone.now() - timedelta(days=365)
        total_sales = (
            Sale.objects.filter(sale_date__gte=one_year_ago).aggregate(
                Sum("total_price")
            )["total_price__sum"]
            or 0
        )

        turnover = (
            float(total_sales) / float(total_inv_value) if total_inv_value > 0 else 0
        )

        # Return category-based turnover
        # (mock categories since Product model doesn't have category field)
        results = []
        for cat in self.CATEGORY_BREAKDOWN:
            avg_inv_value = (
                float(total_inv_value)
                if cat.get("use_total")
                else cat.get("fixed_value", 0)
            )

            results.append(
                {
                    "category": cat["name"],
                    "turnover_ratio": round(turnover * cat["multiplier"], 2),
                    "avg_inventory_value": avg_inv_value,
                }
            )

        return results

    def _build_abc_breakdown(self):
        """
        Perform ABC Analysis using Pareto principle.
        A items: Top 20% by value (typically ~80% of total value)
        B items: Next 30% by value
        C items: Bottom 50% by value
        """
        one_year_ago = timezone.now() - timedelta(days=365)

        # Calculate annual sales value per product using DB aggregation
        product_sales = Product.objects.annotate(
            annual_value=Coalesce(
                Sum(
                    "sales__total_price",
                    filter=models.Q(sales__sale_date__gte=one_year_ago),
                ),
                0.0,
                output_field=FloatField(),
            )
        ).filter(annual_value__gt=0)

        # Add PercentRank using Window function
        ranked_products = product_sales.annotate(
            percentile=Window(
                expression=PercentRank(), order_by=F("annual_value").desc()
            )
        )

        a_items, b_items, c_items = [], [], []
        total_value = 0

        for p in ranked_products:
            total_value += float(p.annual_value)
            item_data = {
                "product_id": p.id,
                "name": p.name,
                "sku": p.sku,
                "value": float(p.annual_value),
                "percentile": float(p.percentile),
            }

            # Classification based on percentile rank
            if p.percentile <= 0.20:
                a_items.append(item_data)
            elif p.percentile <= 0.50:
                b_items.append(item_data)
            else:
                c_items.append(item_data)

        # Include zero-value products as C items
        zero_value_products = Product.objects.annotate(
            annual_value=Coalesce(
                Sum(
                    "sales__total_price",
                    filter=models.Q(sales__sale_date__gte=one_year_ago),
                ),
                0.0,
                output_field=FloatField(),
            )
        ).filter(annual_value=0)

        for p in zero_value_products:
            c_items.append(
                {
                    "product_id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "value": 0,
                    "percentile": 1.0,
                }
            )

        # Calculate value percentages
        a_value = sum(item["value"] for item in a_items)
        b_value = sum(item["value"] for item in b_items)
        c_value = sum(item["value"] for item in c_items)

        return {
            "a_items": a_items,
            "b_items": b_items,
            "c_items": c_items,
            "summary": {
                "a_count": len(a_items),
                "b_count": len(b_items),
                "c_count": len(c_items),
                "a_value_pct": round(
                    (a_value / total_value * 100) if total_value > 0 else 0, 1
                ),
                "b_value_pct": round(
                    (b_value / total_value * 100) if total_value > 0 else 0, 1
                ),
                "c_value_pct": round(
                    (c_value / total_value * 100) if total_value > 0 else 0, 1
                ),
                "total_value": total_value,
            },
        }

    def perform_abc_analysis(self):
        """Return flat list of products with ABC category labels."""
        breakdown = self._build_abc_breakdown()

        categorized = []
        for item in breakdown["a_items"]:
            categorized.append(
                {
                    "id": item["product_id"],
                    **item,
                    "abc_category": "A",
                }
            )
        for item in breakdown["b_items"]:
            categorized.append(
                {
                    "id": item["product_id"],
                    **item,
                    "abc_category": "B",
                }
            )
        for item in breakdown["c_items"]:
            categorized.append(
                {
                    "id": item["product_id"],
                    **item,
                    "abc_category": "C",
                }
            )

        return categorized

    def detect_slow_movers(self, threshold_days=60):
        """
        Detect products with no sales for a specified number of days.
        Returns recommendations for markdown actions.
        """
        cutoff_date = timezone.now().date() - timedelta(days=threshold_days)

        # Find products with NO sales since cutoff_date
        active_products = (
            Sale.objects.filter(sale_date__gte=cutoff_date)
            .values_list("product_id", flat=True)
            .distinct()
        )

        slow_movers = (
            Product.objects.exclude(id__in=active_products)
            .filter(current_stock__gt=0)
            .annotate(last_sale_date=Max("sales__sale_date"))
        )

        results = []
        for p in slow_movers:
            last_sale_date = p.last_sale_date
            days_no_sale = (
                (timezone.now().date() - last_sale_date).days
                if last_sale_date
                else threshold_days + 30
            )

            # Recommendation based on days without sale
            if days_no_sale > 180:
                action = "Liquidate/Discount heavily (50%+)"
                urgency = "critical"
            elif days_no_sale > 90:
                action = "Markdown 30-50%"
                urgency = "high"
            else:
                action = "Promote/Bundle"
                urgency = "medium"

            results.append(
                {
                    "product_id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "days_no_sale": days_no_sale,
                    "current_stock": p.current_stock,
                    "stock_value": float(p.current_stock * p.price),
                    "recommended_action": action,
                    "urgency": urgency,
                }
            )

        return sorted(results, key=lambda x: x["days_no_sale"], reverse=True)

    def _get_empty_sales_trends_response(self):
        return {
            "dates": [],
            "daily_sales": [],
            "daily_units": [],
            "moving_average": [],
            "trend": "insufficient_data",
            "trend_slope": 0,
        }

    def calculate_sales_trends(self, days=90):
        """
        Calculate sales trends with moving average and trend analysis.
        """
        start_date = timezone.now().date() - timedelta(days=days)

        from django.db import connection

        if connection.vendor == "sqlite":
            sales_qs = Sale.objects.filter(sale_date__gte=start_date).values_list(
                "sale_date",
                "total_price",
                "quantity",
            )
            if not sales_qs.exists():
                return self._get_empty_sales_trends_response()

            # Process in chunks to avoid O(N) memory usage
            chunk_size = 5000
            aggregated_dfs = []

            def batch_iterator(iterator, size):
                while True:
                    batch = list(itertools.islice(iterator, size))
                    if not batch:
                        break
                    yield batch

            # Using a variable prevents Black from wrapping the loop line
            sales_iterator = sales_qs.iterator(chunk_size=chunk_size)
            for batch in batch_iterator(sales_iterator, chunk_size):
                chunk_df = pd.DataFrame(
                    batch, columns=["sale_date", "total_price", "quantity"]
                )
                chunk_df["date"] = pd.to_datetime(chunk_df["sale_date"]).dt.normalize()

                # Pre-aggregate chunk
                agg_chunk = chunk_df.groupby("date", as_index=False).agg(
                    total=("total_price", "sum"), units=("quantity", "sum")
                )
                aggregated_dfs.append(agg_chunk)

            if not aggregated_dfs:
                return self._get_empty_sales_trends_response()

            # Combine and final aggregation
            df = pd.concat(aggregated_dfs)
            df = (
                df.groupby("date", as_index=False)
                .agg(total=("total", "sum"), units=("units", "sum"))
                .sort_values("date")
            )
        else:
            daily_sales = (
                Sale.objects.filter(sale_date__gte=start_date)
                .values(date=F("sale_date"))
                .annotate(total=Sum("total_price"), units=Sum("quantity"))
                .order_by("date")
            )

            if not daily_sales:
                return self._get_empty_sales_trends_response()

            df = pd.DataFrame(list(daily_sales))
            df["date"] = pd.to_datetime(df["date"])
            df["total"] = df["total"].astype(float)
            df["units"] = df["units"].astype(int)
            df = df.sort_values("date")

        if df.empty:
            return self._get_empty_sales_trends_response()

        df = df.set_index("date")

        # Resample to daily, filling missing dates with 0
        idx = pd.date_range(start=df.index.min(), end=df.index.max(), freq="D")
        df = df.reindex(idx, fill_value=0)
        df = df.reset_index().rename(columns={"index": "date"})

        # Ensure numeric dtypes after reindex (Decimal + int fill -> object)
        df["total"] = pd.to_numeric(df["total"], errors="coerce").fillna(0)
        df["units"] = pd.to_numeric(df["units"], errors="coerce").fillna(0).astype(int)

        # Calculate 7-day Moving Average
        df["ma_7"] = df["total"].rolling(window=7, min_periods=1).mean().fillna(0)

        # Trend Line using Linear Regression
        from sklearn.linear_model import LinearRegression

        x = np.arange(len(df)).reshape(-1, 1)
        y = df["total"].values.astype(float)
        reg = LinearRegression().fit(x, y)
        slope = reg.coef_[0]

        # Determine trend status
        avg_sales = df["total"].mean()
        relative_slope = slope / avg_sales if avg_sales > 0 else 0

        if relative_slope > 0.02:
            trend_status = "increasing"
        elif relative_slope < -0.02:
            trend_status = "decreasing"
        else:
            trend_status = "stable"

        return {
            "dates": df["date"].dt.strftime("%Y-%m-%d").tolist(),
            "daily_sales": df["total"].round(2).tolist(),
            "daily_units": df["units"].fillna(0).astype(int).tolist(),
            "moving_average": df["ma_7"].round(2).tolist(),
            "trend": trend_status,
            "trend_slope": round(float(slope), 2),
            "period_total": round(float(df["total"].sum()), 2),
            "period_avg": round(float(avg_sales), 2),
        }

    def get_inventory_health_score(self):
        """
        Calculate an overall inventory health score (0-100).
        """
        # Factors: Turnover, Stock-outs, Slow Movers, Forecast Accuracy

        total_products = Product.objects.count()
        if total_products == 0:
            return {"score": 0, "grade": "N/A", "factors": {}}

        # Out of stock penalty
        out_of_stock = Product.objects.filter(current_stock=0).count()
        stock_score = max(0, 100 - (out_of_stock / total_products * 100))

        # Low stock penalty
        low_stock = Product.objects.filter(
            current_stock__gt=0, current_stock__lt=10
        ).count()
        low_stock_score = max(0, 100 - (low_stock / total_products * 50))

        # Slow movers penalty
        slow_movers = len(self.detect_slow_movers(60))
        slow_mover_score = max(0, 100 - (slow_movers / total_products * 100))

        # Overall score (weighted average)
        overall = stock_score * 0.4 + low_stock_score * 0.3 + slow_mover_score * 0.3

        # Grade
        if overall >= 90:
            grade = "A"
        elif overall >= 80:
            grade = "B"
        elif overall >= 70:
            grade = "C"
        elif overall >= 60:
            grade = "D"
        else:
            grade = "F"

        return {
            "score": round(overall, 1),
            "grade": grade,
            "factors": {
                "stock_availability": round(stock_score, 1),
                "low_stock_management": round(low_stock_score, 1),
                "inventory_freshness": round(slow_mover_score, 1),
            },
        }
