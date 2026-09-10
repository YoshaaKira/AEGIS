from __future__ import annotations

from collections import defaultdict

from aegis_core.algorithms.search import ucs
from aegis_core.domain.models import Disruption, GraphInput, Plan, Route, Shipment
from aegis_core.services.compliance import route_is_compliant
from aegis_core.services.risk import edge_risk


class ResiliencePlanner:
    """Cost + disruption-risk shortest path planner; no external solver is used here."""

    def __init__(self, graph: GraphInput) -> None:
        self.graph = graph
        self.routes = {route.id: route for route in graph.routes}
        self.adjacency: dict[str, list[Route]] = defaultdict(list)
        for route in graph.routes:
            self.adjacency[route.origin_id].append(route)

    def plan(self, shipment: Shipment, disruptions: list[Disruption] | None = None, risk_weight: float = 0.0) -> Plan:
        disruptions = disruptions or []

        def neighbors(node: str) -> list[tuple[str, float]]:
            return [
                (route.destination_id, route.cost * (1 + risk_weight * edge_risk(route, disruptions)))
                for route in self.adjacency[node]
                if route_is_compliant(route, shipment) and not any(d.edge_id == route.id and d.severity >= 1 for d in disruptions)
            ]

        result = ucs(shipment.origin_id, shipment.destination_id, neighbors)
        if result is None:
            raise ValueError("No feasible compliant route exists for shipment")
        nodes, _ = result
        route_ids = self._edges_for(nodes, shipment, disruptions, risk_weight)
        total_cost = sum(self.routes[route_id].cost for route_id in route_ids)
        regret = sum(self.routes[route_id].cost * edge_risk(self.routes[route_id], disruptions) for route_id in route_ids)
        return Plan(shipment_id=shipment.id, route_ids=route_ids, total_cost=total_cost, expected_regret=regret)

    def _edges_for(self, nodes: list[str], shipment: Shipment, disruptions: list[Disruption], risk_weight: float) -> list[str]:
        selected: list[str] = []
        for origin, destination in zip(nodes, nodes[1:], strict=True):
            candidates = [route for route in self.adjacency[origin] if route.destination_id == destination and route_is_compliant(route, shipment)]
            selected.append(min(candidates, key=lambda route: route.cost * (1 + risk_weight * edge_risk(route, disruptions))).id)
        return selected
