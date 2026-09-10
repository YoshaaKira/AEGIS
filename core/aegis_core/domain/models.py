from __future__ import annotations

from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, model_validator


class PlanStatus(StrEnum):
    PENDING = "pending"
    FINALIZED = "finalized"
    INVALIDATED = "invalidated"
    REPLANNED = "replanned"


class Depot(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float


class Route(BaseModel):
    id: str
    origin_id: str
    destination_id: str
    cost: float = Field(gt=0)
    time_hours: float = Field(gt=0)
    risk_prior: float = Field(default=0.0, ge=0, le=1)
    restricted_goods: set[str] = Field(default_factory=set)


class Shipment(BaseModel):
    id: str
    origin_id: str
    destination_id: str
    goods_type: str
    weight_kg: float = Field(gt=0)
    deadline_hours: float | None = Field(default=None, gt=0)


class Disruption(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    type: str
    edge_id: str
    severity: float = Field(ge=0, le=1)
    source: str = "manual"


class Plan(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    shipment_id: str
    route_ids: list[str]
    total_cost: float
    expected_regret: float
    status: PlanStatus = PlanStatus.FINALIZED


class GraphInput(BaseModel):
    depots: list[Depot]
    routes: list[Route]

    @model_validator(mode="after")
    def route_nodes_exist(self) -> GraphInput:
        ids = {depot.id for depot in self.depots}
        for route in self.routes:
            if route.origin_id not in ids or route.destination_id not in ids:
                raise ValueError(f"Route {route.id} references an unknown depot")
        return self
