from __future__ import annotations

import asyncio

from aegis_core import Disruption, ResiliencePlanner
from aegis_core.domain.models import GraphInput, PlanStatus, Shipment
from aegis_core.services.pareto import frontier
from fastapi import Depends, FastAPI, HTTPException, WebSocket
from fastapi.responses import PlainTextResponse
from fastapi.security import APIKeyHeader
from prometheus_client import Counter, generate_latest

from .config import settings
from .schemas import BenchmarkResult, PlanRequest
from .schemas import Plan as PlanResponse
from .store import store

app = FastAPI(title="AEGIS API", version="0.1.0")
plans_created = Counter("aegis_plans_created_total", "Number of plans generated")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def auth(x_api_key: str | None = Depends(api_key_header)) -> None:
    if x_api_key != settings.aegis_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


def planner() -> ResiliencePlanner:
    if store.graph is None:
        raise HTTPException(status_code=409, detail="Load a graph first")
    return ResiliencePlanner(store.graph)


@app.post("/v1/graph", dependencies=[Depends(auth)])
def load_graph(graph: GraphInput) -> GraphInput:
    store.graph = graph
    return graph


@app.post("/v1/shipments", dependencies=[Depends(auth)])
def load_shipments(shipments: list[Shipment]) -> list[Shipment]:
    store.shipments.update({shipment.id: shipment for shipment in shipments})
    return shipments


@app.post("/v1/plan", dependencies=[Depends(auth)], response_model=list[PlanResponse])
def create_plan(request: PlanRequest):
    shipment = store.shipments.get(request.shipment_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    try:
        # When risk_weight matches the default grid, enumerate the full cost-vs-
        # regret frontier; otherwise return the single requested plan.
        if request.risk_weight == 1.0:
            plans = planner().frontier(shipment, store.disruptions)
        else:
            plans = [planner().plan(shipment, store.disruptions, request.risk_weight)]
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    for plan in plans:
        store.plans[str(plan.id)] = plan
        plans_created.inc()
    return plans


@app.post("/v1/disrupt", dependencies=[Depends(auth)])
def inject_disruption(disruption: Disruption) -> Disruption:
    store.disruptions.append(disruption)
    return disruption


@app.post("/v1/plan/{plan_id}/replan", dependencies=[Depends(auth)])
def replan(plan_id: str):
    plan = store.plans.get(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    shipment = store.shipments[plan.shipment_id]
    replanned = planner().plan(shipment, store.disruptions, risk_weight=1.0)
    replanned.status = PlanStatus.REPLANNED
    store.plans[str(replanned.id)] = replanned
    return replanned


@app.get("/v1/benchmark/ortools", response_model=BenchmarkResult, dependencies=[Depends(auth)])
def benchmark(plan_id: str) -> BenchmarkResult:
    plan = store.plans.get(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    # The production worker owns the OR-Tools call; this endpoint is an
    # honest placeholder returning only the AEGIS figures.
    return BenchmarkResult(
        plan_id=plan_id,
        aegis_cost=plan.total_cost,
        aegis_regret=plan.expected_regret,
    )


@app.get("/v1/pareto", dependencies=[Depends(auth)])
def pareto():
    return frontier(list(store.plans.values()))


@app.websocket("/v1/stream/simulation")
async def stream_simulation(websocket: WebSocket) -> None:
    await websocket.accept()
    await websocket.send_json({"type": "connected", "payload": {}})
    while True:
        await asyncio.sleep(15)
        await websocket.send_json({"type": "heartbeat", "payload": {}})


@app.get("/v1/metrics", response_class=PlainTextResponse)
def metrics() -> bytes:
    return generate_latest()
