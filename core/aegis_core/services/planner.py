from __future__ import annotations

from collections import defaultdict

from aegis_core.algorithms.search import Heuristic, ucs
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

    def plan(
        self,
        shipment: Shipment,
        disruptions: list[Disruption] | None = None,
        risk_weight: float = 0.0,
        heuristic: Heuristic | None = None,
    ) -> Plan:
        """Plan a route for ``shipment``.

        With ``heuristic`` supplied the underlying search becomes A* over an
        admissible estimator (e.g. great-circle distance); with ``None`` it is
        plain uniform-cost search, preserving existing behaviour.
        """
        disruptions = disruptions or []

        def neighbors(node: str) -> list[tuple[str, float]]:
            return [
                (
                    route.destination_id,
                    route.cost * (1 + risk_weight * edge_risk(route, disruptions)),
                )
                for route in self.adjacency[node]
                if route_is_compliant(route, shipment)
                and not any(d.edge_id == route.id and d.severity >= 1 for d in disruptions)
            ]

        result = ucs(shipment.origin_id, shipment.destination_id, neighbors, heuristic)
        if result is None:
            raise ValueError("No feasible compliant route exists for shipment")
        nodes, _ = result
        route_ids = self._edges_for(nodes, shipment, disruptions, risk_weight)
        total_cost = sum(self.routes[route_id].cost for route_id in route_ids)
        regret = sum(
            self.routes[route_id].cost * edge_risk(self.routes[route_id], disruptions)
            for route_id in route_ids
        )
        return Plan(
            shipment_id=shipment.id,
            route_ids=route_ids,
            total_cost=total_cost,
            expected_regret=regret,
        )

    #: Risk weights swept when enumerating the cost-vs-regret frontier.
    DEFAULT_RISK_GRID: tuple[float, ...] = (0.0, 0.5, 1.0, 2.0, 5.0)

    def frontier(
        self,
        shipment: Shipment,
        disruptions: list[Disruption] | None = None,
        risk_weights: tuple[float, ...] | None = None,
        heuristic: Heuristic | None = None,
    ) -> list[Plan]:
        """Enumerate candidate plans at several risk weights and return the
        Pareto non-dominated subset on ``(total_cost, expected_regret)``.

        Each risk weight yields one candidate via :meth:`plan`; ties on cost
        and regret are deduplicated so the frontier holds distinct (cost, regret)
        points only.
        """
        from aegis_core.services.pareto import frontier as _pareto_frontier

        grid = risk_weights if risk_weights is not None else self.DEFAULT_RISK_GRID
        candidates = [self.plan(shipment, disruptions, w, heuristic) for w in grid]
        return _pareto_frontier(candidates)

    def _edges_for(
        self,
        nodes: list[str],
        shipment: Shipment,
        disruptions: list[Disruption],
        risk_weight: float,
    ) -> list[str]:
        selected: list[str] = []
        for origin, destination in zip(nodes[:-1], nodes[1:], strict=True):
            candidates = [
                route
                for route in self.adjacency[origin]
                if route.destination_id == destination
                and route_is_compliant(route, shipment)
            ]

            def weighted_cost(route: Route) -> float:
                return route.cost * (1 + risk_weight * edge_risk(route, disruptions))

            selected.append(min(candidates, key=weighted_cost).id)
        return selected
