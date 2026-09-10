from aegis_core import Disruption, ResiliencePlanner, Route, Shipment
from aegis_core.domain.models import Depot, GraphInput


def graph() -> GraphInput:
    return GraphInput(depots=[Depot(id=x, name=x, latitude=0, longitude=0) for x in "ABC"], routes=[Route(id="ab", origin_id="A", destination_id="B", cost=3, time_hours=1, risk_prior=0.7), Route(id="bc", origin_id="B", destination_id="C", cost=3, time_hours=1), Route(id="ac", origin_id="A", destination_id="C", cost=8, time_hours=2)])


def test_resilience_weight_changes_route() -> None:
    shipment = Shipment(id="s", origin_id="A", destination_id="C", goods_type="general", weight_kg=1)
    planner = ResiliencePlanner(graph())
    assert planner.plan(shipment).route_ids == ["ab", "bc"]
    assert planner.plan(shipment, risk_weight=2).route_ids == ["ac"]


def test_full_disruption_removes_edge() -> None:
    shipment = Shipment(id="s", origin_id="A", destination_id="C", goods_type="general", weight_kg=1)
    plan = ResiliencePlanner(graph()).plan(shipment, [Disruption(type="weather", edge_id="ab", severity=1)])
    assert plan.route_ids == ["ac"]
