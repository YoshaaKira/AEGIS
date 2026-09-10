from pydantic import BaseModel, Field

from aegis_core.domain.models import Disruption, GraphInput, Plan, Shipment


class PlanRequest(BaseModel):
    shipment_id: str
    objective: str = "min_cost_bounded_regret"
    risk_weight: float = Field(default=1.0, ge=0)


class BenchmarkResult(BaseModel):
    plan_id: str
    aegis_cost: float
    aegis_regret: float
    ortools_cost: float | None = None
    ortools_regret: float | None = None
    cost_delta_pct: float | None = None
    regret_delta_pct: float | None = None


__all__ = ["BenchmarkResult", "Disruption", "GraphInput", "Plan", "PlanRequest", "Shipment"]
