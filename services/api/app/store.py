from aegis_core.domain.models import Disruption, GraphInput, Plan, Shipment


class ScenarioStore:
    """Development store; replace calls with repository persistence after Alembic bootstrap."""
    graph: GraphInput | None = None
    shipments: dict[str, Shipment] = {}
    plans: dict[str, Plan] = {}
    disruptions: list[Disruption] = []


store = ScenarioStore()
