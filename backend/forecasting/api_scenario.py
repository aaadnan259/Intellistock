"""API endpoints for what-if scenario analysis."""

import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from inventory.models import Product
from .scenario_engine import compare_scenarios

logger = logging.getLogger(__name__)


@api_view(["POST"])
def scenario_compare(request):
    """
    POST /api/forecasting/scenario/compare/

    Compare multiple what-if scenarios.
    Body:
        {
            "product_id": int,
            "scenarios": [
                {
                    "type": "demand_change|promotion|supply_disruption",
                    "name": "Scenario Name",
                    "parameters": {...}
                }
            ],
            "forecast_days": int (optional, default 30)
        }
    """
    try:
        data = request.data
        product_id = data.get("product_id")
        scenarios = data.get("scenarios", [])
        forecast_days = data.get("forecast_days", 30)

        if not product_id:
            return Response(
                {"error": "product_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate product exists
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": f"Product {product_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not scenarios:
            return Response(
                {"error": "At least one scenario is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(scenarios) > 5:
            return Response(
                {"error": "Maximum 5 scenarios allowed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Run scenario comparison
        result = compare_scenarios(product_id, scenarios, forecast_days)
        result["product_name"] = product.name

        return Response({"status": "success", "data": result})

    except Exception as e:
        logger.exception("Error running scenario comparison")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
