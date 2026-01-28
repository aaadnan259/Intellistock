"""API endpoints for forecast explainability."""
import logging
from datetime import timedelta

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from inventory.models import Product, Sale
from .explainability import ForecastExplainer

logger = logging.getLogger(__name__)


@api_view(["GET"])
def forecast_explanation(request, product_id: int):
    """
    GET /api/forecasting/{product_id}/explain/

    Returns SHAP-based explanation for forecast.
    Query params:
        - days: forecast horizon (default: 30)
    """
    _days = int(request.query_params.get("days", 30))  # noqa: F841 - reserved

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
        sales = Sale.objects.filter(product=product).values("sale_date", "quantity")
        if len(sales) < 30:
            return Response(
                {"error": "Insufficient sales data for explanation"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import pandas as pd

        sales_df = pd.DataFrame(list(sales))

        # Prepare explainer
        explainer = ForecastExplainer()
        feature_df = explainer.prepare_features(sales_df)

        if len(feature_df) < 14:
            return Response(
                {"error": "Not enough data after feature engineering"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        feature_cols = [
            c for c in feature_df.columns if c not in ["quantity", "sale_date"]
        ]
        X = feature_df[feature_cols]
        y = feature_df["quantity"]

        # Train a simple model for explainability
        from sklearn.ensemble import GradientBoostingRegressor

        model = GradientBoostingRegressor(n_estimators=50, max_depth=4, random_state=42)
        model.fit(X, y)

        # Fit explainer
        explainer.fit_explainer(model, X, model_type="tree")

        # Get global importance
        global_importance = explainer.get_global_feature_importance(X)

        # Get local explanation for most recent prediction
        X_last = X.tail(1)
        prediction = model.predict(X_last)[0]
        last_date = feature_df["sale_date"].iloc[-1]
        pred_date = (last_date + timedelta(days=1)).strftime("%Y-%m-%d")

        local_explanation = explainer.explain_prediction(
            X_last, prediction, product_id, pred_date
        )

        return Response(
            {
                "status": "success",
                "data": {
                    "product_id": product_id,
                    "product_name": product.name,
                    "global_feature_importance": global_importance,
                    "prediction_explanation": {
                        "date": local_explanation.prediction_date,
                        "predicted_value": local_explanation.predicted_value,
                        "base_value": local_explanation.base_value,
                        "explanation_text": local_explanation.explanation_text,
                        "contributions": [
                            {
                                "feature": c.feature_name,
                                "value": c.feature_value,
                                "shap_value": c.shap_value,
                                "percent": c.contribution_percent,
                            }
                            for c in local_explanation.feature_contributions[:10]
                        ],
                    },
                },
            }
        )

    except Exception as e:
        logger.exception(f"Error generating explanation for product {product_id}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
