from __future__ import annotations

import asyncio
import heapq
import time
from collections import deque

from aegis_core import Disruption, ResiliencePlanner
from aegis_core.algorithms.search import (
    astar,
    bfs,
    dfs,
    great_circle_heuristic,
    greedy_best_first,
    hill_climbing,
    ucs,
)
from aegis_core.domain.models import GraphInput, PlanStatus, Shipment
from aegis_core.services.compliance import route_is_compliant
from aegis_core.services.pareto import frontier
from fastapi import Depends, FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.security import APIKeyHeader
from prometheus_client import Counter, generate_latest

from .config import settings
from .schemas import BenchmarkResult, CompareRequest, PlanRequest, TraceRequest
from .schemas import Plan as PlanResponse
from .store import store

app = FastAPI(title="AEGIS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.post("/v1/plan/compare", dependencies=[Depends(auth)])
def compare_algorithms(request: CompareRequest):
    shipment = store.shipments.get(request.shipment_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    p = planner()
    disruptions = store.disruptions
    start = shipment.origin_id
    goal = shipment.destination_id

    def base_neighbors(node: str) -> list[tuple[str, float]]:
        return [
            (route.destination_id, route.cost)
            for route in p.adjacency.get(node, [])
            if route_is_compliant(route, shipment)
            and not any(d.edge_id == route.id and d.severity >= 1 for d in disruptions)
        ]

    coordinates = {d.id: (d.latitude, d.longitude) for d in store.graph.depots}
    try:
        h = great_circle_heuristic(coordinates, goal)
    except Exception:
        h = lambda _: 0.0

    def calc_cost(path: list[str] | None) -> float | None:
        if not path or len(path) < 2:
            return 0.0 if path else None
        total = 0.0
        for u, v in zip(path[:-1], path[1:], strict=True):
            edges = [r for r in p.adjacency.get(u, []) if r.destination_id == v]
            if edges:
                total += min(r.cost for r in edges)
        return total

    algos = [
        ("bfs", lambda n: bfs(start, goal, n)),
        ("dfs", lambda n: dfs(start, goal, n)),
        ("ucs", lambda n: (res := ucs(start, goal, n)) and res[0]),
        ("astar", lambda n: (res := astar(start, goal, n, h)) and res[0]),
        ("greedy", lambda n: greedy_best_first(start, goal, n, h)),
        ("hill_climbing", lambda n: hill_climbing(start, goal, n, h, maximizing=False)),
    ]

    results = []
    for name, run_fn in algos:
        explored = set()

        def n_wrap(node: str, _n=base_neighbors, _exp=explored) -> list[tuple[str, float]]:
            _exp.add(node)
            return _n(node)

        t0 = time.perf_counter()
        try:
            path = run_fn(n_wrap)
        except Exception:
            path = None
        elapsed_ms = (time.perf_counter() - t0) * 1000

        cost = calc_cost(path)
        results.append({
            "algorithm": name,
            "path": path,
            "cost": cost,
            "nodes_explored": len(explored),
            "time_ms": round(elapsed_ms, 3),
            "path_length": len(path) if path else 0,
        })

    return results


@app.post("/v1/plan/trace", dependencies=[Depends(auth)])
def plan_trace(request: TraceRequest):
    shipment = store.shipments.get(request.shipment_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    p = planner()
    disruptions = store.disruptions
    start = shipment.origin_id
    goal = shipment.destination_id
    algo = request.algorithm.lower()

    def base_neighbors(node: str) -> list[tuple[str, float]]:
        return [
            (route.destination_id, route.cost)
            for route in p.adjacency.get(node, [])
            if route_is_compliant(route, shipment)
            and not any(d.edge_id == route.id and d.severity >= 1 for d in disruptions)
        ]

    coordinates = {d.id: (d.latitude, d.longitude) for d in store.graph.depots}
    try:
        h = great_circle_heuristic(coordinates, goal)
    except Exception:
        h = lambda _: 0.0

    steps = []
    step_idx = 0
    final_path = None
    final_cost = None

    if algo == "dfs":
        stack = [(start, None, 0.0, [start])]
        seen = {start}
        while stack:
            node, parent, cost, path = stack.pop()
            is_goal = (node == goal)
            steps.append({
                "step": step_idx,
                "node": node,
                "parent": parent,
                "cost_so_far": cost,
                "frontier_size": len(stack),
                "is_goal": is_goal,
            })
            step_idx += 1
            if is_goal:
                final_path = path
                final_cost = cost
                break
            for child, edge_cost in reversed(base_neighbors(node)):
                if child not in seen:
                    seen.add(child)
                    stack.append((child, node, cost + edge_cost, path + [child]))
    elif algo in ("ucs", "astar"):
        frontier = [(h(start) if algo == "astar" else 0.0, 0.0, start, None, [start])]
        best = {start: 0.0}
        while frontier:
            _, cost, node, parent, path = heapq.heappop(frontier)
            is_goal = (node == goal)
            steps.append({
                "step": step_idx,
                "node": node,
                "parent": parent,
                "cost_so_far": cost,
                "frontier_size": len(frontier),
                "is_goal": is_goal,
            })
            step_idx += 1
            if is_goal:
                final_path = path
                final_cost = cost
                break
            if cost > best.get(node, float("inf")):
                continue
            for child, edge_cost in base_neighbors(node):
                cand = cost + edge_cost
                if cand < best.get(child, float("inf")):
                    best[child] = cand
                    prio = cand + (h(child) if algo == "astar" else 0.0)
                    heapq.heappush(frontier, (prio, cand, child, node, path + [child]))
    else:  # default bfs
        queue = deque([(start, None, 0.0, [start])])
        seen = {start}
        while queue:
            node, parent, cost, path = queue.popleft()
            is_goal = (node == goal)
            steps.append({
                "step": step_idx,
                "node": node,
                "parent": parent,
                "cost_so_far": cost,
                "frontier_size": len(queue),
                "is_goal": is_goal,
            })
            step_idx += 1
            if is_goal:
                final_path = path
                final_cost = cost
                break
            for child, edge_cost in base_neighbors(node):
                if child not in seen:
                    seen.add(child)
                    queue.append((child, node, cost + edge_cost, path + [child]))

    return {
        "algorithm": algo,
        "steps": steps,
        "final_path": final_path,
        "final_cost": final_cost,
    }


@app.websocket("/v1/stream/simulation")
async def stream_simulation(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await websocket.send_json({"type": "connected", "payload": {}})
        while True:
            await asyncio.sleep(15)
            await websocket.send_json({"type": "heartbeat", "payload": {}})
    except Exception:
        pass


@app.get("/v1/metrics", response_class=PlainTextResponse)
def metrics() -> bytes:
    return generate_latest()
