from fastapi.testclient import TestClient

from services.api.app.main import app

client = TestClient(app)
headers = {"X-API-Key": "local-dev-key"}


def test_requires_key() -> None:
    assert client.post("/v1/graph", json={}).status_code == 422


def test_plan_flow() -> None:
    graph = {"depots": [{"id": "a", "name": "A", "latitude": 0, "longitude": 0}, {"id": "b", "name": "B", "latitude": 1, "longitude": 1}], "routes": [{"id": "ab", "origin_id": "a", "destination_id": "b", "cost": 4, "time_hours": 1}]}
    assert client.post("/v1/graph", json=graph, headers=headers).status_code == 200
    shipment = {"id": "s1", "origin_id": "a", "destination_id": "b", "goods_type": "general", "weight_kg": 1}
    assert client.post("/v1/shipments", json=[shipment], headers=headers).status_code == 200
    response = client.post("/v1/plan", json={"shipment_id": "s1"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["total_cost"] == 4
