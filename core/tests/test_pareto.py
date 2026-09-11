from __future__ import annotations

from uuid import UUID

from aegis_core import ResiliencePlanner
from aegis_core.domain.models import (
    Depot,
    Disruption,
    GraphInput,
    Plan,
    Route,
    Shipment,
)
from aegis_core.services.pareto import frontier


def _make_graph() -> GraphInput:
    depots = [
        Depot(id="A", name="A", latitude=0.0, longitude=0.0),
        Depot(id="B", name="B", latitude=0.0, longitude=0.5),
        Depot(id="C", name="C", latitude=0.0, longitude=1.0),
    ]
    routes = [
        # Low-cost, high-risk detour path.
        Route(id="ab", origin_id="A", destination_id="B", cost=30, time_hours=1, risk_prior=0.0),
        Route(id="bc", origin_id="B", destination_id="C", cost=30, time_hours=1, risk_prior=0.0),
        # High-cost, zero-risk direct path with an active disruption.
        Route(id="ac", origin_id="A", destination_id="C", cost=100, time_hours=2, risk_prior=0.0),
    ]
    return GraphInput(depots=depots, routes=routes)


def _shipment() -> Shipment:
    return Shipment(id="s", origin_id="A", destination_id="C", goods_type="general", weight_kg=1)


def test_pareto_filters_dominated_plan() -> None:
    plans = [
        Plan(shipment_id="s", route_ids=["ac"], total_cost=100, expected_regret=0),
        Plan(shipment_id="s", route_ids=["ab", "bc"], total_cost=60, expected_regret=0),
    ]
    result = frontier(plans)
    assert len(result) == 1
    assert result[0].route_ids == ["ab", "bc"]


def test_pareto_keeps_non_dominated_plans() -> None:
    plans = [
        Plan(shipment_id="s", route_ids=["ac"], total_cost=100, expected_regret=0),
        Plan(shipment_id="s", route_ids=["ab", "bc"], total_cost=60, expected_regret=40),
    ]
    result = frontier(plans)
    assert len(result) == 2


def test_pareto_deduplicates_identical_cost_regret() -> None:
    plans = [
        Plan(shipment_id="s", route_ids=["ac"], total_cost=100, expected_regret=0),
        Plan(shipment_id="s", route_ids=["ac"], total_cost=100, expected_regret=0),
    ]
    result = frontier(plans)
    assert len(result) == 1


def test_frontier_returns_plans_at_several_risk_weights() -> None:
    planner = ResiliencePlanner(_make_graph())
    plans = planner.frontier(_shipment())
    # With 5 default risk weights, all routing through ab+bc (cost 60), we expect
    # at least one non-dominated plan. With a disruption on 'ab' at severity 1,
    # all risk weights route via 'ac'.
    assert len(plans) >= 1
    assert all(isinstance(p.id, UUID) for p in plans)


def test_frontier_respects_disruption_and_returns_ac_route() -> None:
    planner = ResiliencePlanner(_make_graph())
    disruption = Disruption(type="weather", edge_id="ab", severity=1)
    plans = planner.frontier(_shipment(), disruptions=[disruption])
    assert len(plans) >= 1
    # With ab closed, only the direct ac route is feasible.
    assert all(plan.route_ids == ["ac"] for plan in plans)


def test_frontier_with_custom_risk_weights() -> None:
    planner = ResiliencePlanner(_make_graph())
    plans = planner.frontier(_shipment(), risk_weights=(0.0, 1.0, 5.0))
    assert len(plans) >= 1
    assert all(isinstance(p, Plan) for p in plans)
