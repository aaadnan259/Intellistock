"""What-If Scenario Analysis Engine."""

from dataclasses import dataclass
from enum import Enum
from typing import Any

import numpy as np

from inventory.models import Sale


class ScenarioType(Enum):
    """Types of what-if scenarios."""

    DEMAND_CHANGE = "demand_change"
    PRICE_CHANGE = "price_change"
    PROMOTION = "promotion"
    SUPPLY_DISRUPTION = "supply_disruption"


@dataclass
class Scenario:
    """Represents a what-if scenario configuration."""

    type: ScenarioType
    name: str
    parameters: dict[str, Any]
    description: str


class ScenarioEngine:
    """Simulates what-if scenarios for demand forecasting."""

    PROMOTION_MULTIPLIERS = {
        "light": 1.15,
        "medium": 1.30,
        "heavy": 1.50,
        "flash_sale": 2.0,
    }
    DEFAULT_ELASTICITY = -1.5

    def __init__(self) -> None:
        pass

    def get_baseline_forecast(
        self, product_id: int, forecast_days: int = 30
    ) -> list[float]:
        """Get baseline forecast for a product."""
        import pandas as pd

        sales = Sale.objects.filter(product_id=product_id).values(
            "sale_date", "quantity"
        )
        if len(sales) < 14:
            return [0.0] * forecast_days

        df = pd.DataFrame(list(sales))
        df["sale_date"] = pd.to_datetime(df["sale_date"])
        df = df.sort_values("sale_date")

        # Use rolling average as simple baseline
        recent_avg = df["quantity"].tail(14).mean()

        # Generate forecast with some variance
        forecast = []
        for i in range(forecast_days):
            # Add day-of-week pattern
            dow_factor = 1.0 + 0.1 * np.sin(2 * np.pi * i / 7)
            value = max(0, recent_avg * dow_factor)
            forecast.append(round(float(value), 2))

        return forecast

    def run_scenario(
        self,
        product_id: int,
        scenario: Scenario,
        forecast_days: int = 30,
    ) -> dict[str, Any]:
        """Run what-if simulation and return adjusted forecast."""
        baseline = self.get_baseline_forecast(product_id, forecast_days)
        adjusted = self._apply_scenario(baseline, scenario)
        impact = self._calculate_impact(baseline, adjusted)
        recommendations = self._generate_recommendations(scenario, impact)

        return {
            "scenario": {
                "type": scenario.type.value,
                "name": scenario.name,
                "description": scenario.description,
            },
            "baseline_forecast": baseline,
            "adjusted_forecast": adjusted,
            "impact": impact,
            "recommendations": recommendations,
        }

    def _apply_scenario(self, baseline: list[float], scenario: Scenario) -> list[float]:
        """Apply scenario adjustments to baseline forecast."""
        forecast = np.array(baseline)
        params = scenario.parameters

        if scenario.type == ScenarioType.DEMAND_CHANGE:
            pct_change = params.get("percent_change", 0) / 100
            forecast = forecast * (1 + pct_change)

        elif scenario.type == ScenarioType.PRICE_CHANGE:
            price_change = params.get("percent_change", 0) / 100
            elasticity = params.get("elasticity", self.DEFAULT_ELASTICITY)
            forecast = forecast * (1 + (price_change * elasticity))

        elif scenario.type == ScenarioType.PROMOTION:
            duration = min(params.get("duration_days", 7), len(forecast))
            intensity = params.get("intensity", "medium")
            multiplier = self.PROMOTION_MULTIPLIERS.get(intensity, 1.3)
            forecast[:duration] = forecast[:duration] * multiplier
            # Post-promotion dip
            dip_end = min(duration * 2, len(forecast))
            if duration < len(forecast):
                forecast[duration:dip_end] = forecast[duration:dip_end] * 0.9

        elif scenario.type == ScenarioType.SUPPLY_DISRUPTION:
            duration = min(params.get("duration_days", 14), len(forecast))
            forecast[:duration] = 0

        return [round(max(0, float(v)), 2) for v in forecast]

    def _calculate_impact(
        self, baseline: list[float], adjusted: list[float]
    ) -> dict[str, Any]:
        """Calculate scenario impact metrics."""
        b = np.array(baseline)
        a = np.array(adjusted)
        baseline_sum = float(np.sum(b))

        return {
            "baseline_total": round(baseline_sum, 2),
            "adjusted_total": round(float(np.sum(a)), 2),
            "percent_change": (
                round(float((np.sum(a) - np.sum(b)) / baseline_sum * 100), 2)
                if baseline_sum > 0
                else 0
            ),
            "peak_demand": round(float(np.max(a)), 2),
            "avg_daily_difference": round(float(np.mean(a - b)), 2),
        }

    def _generate_recommendations(
        self, scenario: Scenario, impact: dict[str, Any]
    ) -> list[str]:
        """Generate actionable recommendations based on scenario impact."""
        recs = []
        pct = impact["percent_change"]

        if pct > 20:
            recs.append(
                f"⚠️ {pct:.1f}% demand increase expected. Consider increasing safety stock."
            )
        elif pct < -20:
            recs.append(
                f"📉 {pct:.1f}% demand decrease expected. Review inventory levels."
            )

        if scenario.type == ScenarioType.PROMOTION:
            recs.append(
                f"📦 Peak demand: {impact['peak_demand']:.0f} units. Ensure capacity."
            )
            recs.append("🔄 Plan for post-promotion dip (~10% reduction).")

        if scenario.type == ScenarioType.SUPPLY_DISRUPTION:
            duration = scenario.parameters.get("duration_days", 14)
            recs.append(f"🚨 Zero supply for {duration} days. Notify customers.")
            recs.append("📋 Identify alternative suppliers if possible.")

        if not recs:
            recs.append("✅ Impact within normal parameters. No action required.")

        return recs


def compare_scenarios(
    product_id: int,
    scenarios: list[dict[str, Any]],
    forecast_days: int = 30,
) -> dict[str, Any]:
    """Compare multiple scenarios for a product."""
    engine = ScenarioEngine()
    baseline = engine.get_baseline_forecast(product_id, forecast_days)

    results = []
    for s in scenarios:
        scenario = Scenario(
            type=ScenarioType(s.get("type", "demand_change")),
            name=s.get("name", "Unnamed Scenario"),
            parameters=s.get("parameters", {}),
            description=s.get("description", ""),
        )
        result = engine.run_scenario(product_id, scenario, forecast_days)
        results.append(
            {
                "scenario_name": scenario.name,
                "adjusted_forecast": result["adjusted_forecast"],
                "impact": result["impact"],
                "recommendations": result["recommendations"],
            }
        )

    return {
        "product_id": product_id,
        "baseline_forecast": baseline,
        "comparison": results,
    }
