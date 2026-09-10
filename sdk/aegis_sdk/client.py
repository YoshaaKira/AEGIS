from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import httpx


class AegisClient:
    """Synchronous thin client mirroring the public AEGIS HTTP API."""

    def __init__(self, base_url: str, api_key: str, timeout: float = 30) -> None:
        self.client = httpx.Client(base_url=base_url.rstrip("/") + "/v1", headers={"X-API-Key": api_key}, timeout=timeout)

    def load_graph(self, depots: list[dict[str, Any]], routes: list[dict[str, Any]]) -> dict[str, Any]:
        return self.client.post("/graph", json={"depots": depots, "routes": routes}).raise_for_status().json()

    def load_shipments(self, shipments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return self.client.post("/shipments", json=shipments).raise_for_status().json()

    def plan(self, shipment_id: str, objective: str = "min_cost_bounded_regret", risk_weight: float = 1.0) -> dict[str, Any]:
        return self.client.post("/plan", json={"shipment_id": shipment_id, "objective": objective, "risk_weight": risk_weight}).raise_for_status().json()

    def disrupt(self, type: str, edge_id: str, severity: float, source: str = "manual") -> dict[str, Any]:
        return self.client.post("/disrupt", json={"type": type, "edge_id": edge_id, "severity": severity, "source": source}).raise_for_status().json()

    def replan(self, plan_id: str) -> dict[str, Any]:
        return self.client.post(f"/plan/{plan_id}/replan").raise_for_status().json()

    def benchmark_against_ortools(self, plan_id: str) -> dict[str, Any]:
        return self.client.get("/benchmark/ortools", params={"plan_id": plan_id}).raise_for_status().json()

    def pareto(self) -> list[dict[str, Any]]:
        return self.client.get("/pareto").raise_for_status().json()

    def stream_simulation(self) -> Iterator[dict[str, Any]]:
        raise NotImplementedError("Use a WebSocket client against /v1/stream/simulation in v0.1")
