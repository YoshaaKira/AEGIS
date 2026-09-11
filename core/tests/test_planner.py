from aegis_core import Disruption, ResiliencePlanner, Route, Shipment
from aegis_core.algorithms.search import great_circle_heuristic
from aegis_core.domain.models import Depot, GraphInput


def graph() -> GraphInput:
    depots = [Depot(id=x, name=x, latitude=0.0, longitude=0.0) for x in "ABC"]
    routes = [
        Route(id="ab", origin_id="A", destination_id="B", cost=3, time_hours=1, risk_prior=0.7),
        Route(id="bc", origin_id="B", destination_id="C", cost=3, time_hours=1),
        Route(id="ac", origin_id="A", destination_id="C", cost=8, time_hours=2),
    ]
    return GraphInput(depots=depots, routes=routes)


def test_resilience_weight_changes_route() -> None:
    shipment = Shipment(
        id="s", origin_id="A", destination_id="C", goods_type="general", weight_kg=1
    )
    planner = ResiliencePlanner(graph())
    assert planner.plan(shipment).route_ids == ["ab", "bc"]
    assert planner.plan(shipment, risk_weight=2).route_ids == ["ac"]


def test_full_disruption_removes_edge() -> None:
    shipment = Shipment(
        id="s", origin_id="A", destination_id="C", goods_type="general", weight_kg=1
    )
    plan = ResiliencePlanner(graph()).plan(
        shipment, [Disruption(type="weather", edge_id="ab", severity=1)]
    )
    assert plan.route_ids == ["ac"]


def test_great_circle_heuristic_makes_plan_adversary_optimal() -> None:
    # Depots on the equator: 0.5 deg ~ 55.6 km, 1.0 deg ~ 111.2 km.
    # Costs (60/60/200) all exceed the great-circle distance between endpoints,
    # so the heuristic is admissible and A* must pick the optimal route.
    depots = [
        Depot(id="A", name="A", latitude=0.0, longitude=0.0),
        Depot(id="B", name="B", latitude=0.0, longitude=0.5),
        Depot(id="C", name="C", latitude=0.0, longitude=1.0),
    ]
    routes = [
        Route(id="ab", origin_id="A", destination_id="B", cost=60, time_hours=1, risk_prior=0.0),
        Route(id="bc", origin_id="B", destination_id="C", cost=60, time_hours=1, risk_prior=0.0),
        Route(id="ac", origin_id="A", destination_id="C", cost=200, time_hours=2, risk_prior=0.0),
    ]
    shipment = Shipment(
        id="s", origin_id="A", destination_id="C", goods_type="general", weight_kg=1
    )
    planner = ResiliencePlanner(GraphInput(depots=depots, routes=routes))
    coordinates = {depot.id: (depot.latitude, depot.longitude) for depot in depots}
    heuristic = great_circle_heuristic(coordinates, "C")
    plan = planner.plan(shipment, risk_weight=0.0, heuristic=heuristic)
    assert plan.route_ids == ["ab", "bc"]
    assert plan.total_cost == 120
