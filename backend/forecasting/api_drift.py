"""API endpoints for drift detection."""

import logging
from datetime import datetime, timedelta

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from inventory.models import Product, Sale
from .drift_detection import check_drift_for_product

logger = logging.getLogger(__name__)


@api_view(["GET"])
def drift_status(request, product_id: int):
    """
    GET /api/forecasting/{product_id}/drift/

    Returns drift detection status for a product.
    Query params:
        - reference_days: days of reference data (default: 60)
        - current_days: days of current data (default: 14)
    """
    reference_days = int(request.query_params.get("reference_days", 60))
    current_days = int(request.query_params.get("current_days", 14))

    try:
        # Validate product exists
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": f"Product {product_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get sales data
        import pandas as pd

        all_sales = Sale.objects.filter(product=product).values("sale_date", "quantity")
        if len(all_sales) < 30:
            return Response(
                {"error": "Insufficient sales data for drift analysis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sales_df = pd.DataFrame(list(all_sales))
        sales_df["sale_date"] = pd.to_datetime(sales_df["sale_date"])

        # Split data into reference (older) and current (recent)
        today = datetime.now()
        cutoff = today - timedelta(days=current_days)
        reference_start = today - timedelta(days=reference_days + current_days)

        current_data = sales_df[sales_df["sale_date"] >= cutoff]
        reference_data = sales_df[
            (sales_df["sale_date"] >= reference_start)
            & (sales_df["sale_date"] < cutoff)
        ]

        if len(reference_data) < 14 or len(current_data) < 5:
            return Response(
                {
                    "status": "success",
                    "data": {
                        "product_id": product_id,
                        "product_name": product.name,
                        "drift_summary": {
                            "data_drift_detected": False,
                            "dataset_drift_score": 0,
                        },
                        "drifted_features": [],
                        "feature_drift_scores": {},
                        "action_required": False,
                        "recommendation": (
                            "INSUFFICIENT DATA: Need more historical data"
                        ),
                    },
                }
            )

        # Run drift detection
        drift_result = check_drift_for_product(product_id, reference_data, current_data)
        drift_result["product_name"] = product.name

        return Response({"status": "success", "data": drift_result})

    except Exception as e:
        logger.exception(f"Error checking drift for product {product_id}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
