from fastapi.testclient import TestClient

from services.api.app.main import app

client = TestClient(app)
headers = {"X-API-Key": "local-dev-key"}


def test_requires_key() -> None:
    # Without a valid X-API-Key the auth dependency rejects the request before body validation.
    assert client.post("/v1/graph", json={}).status_code == 401


def test_requires_key_blocks_wrong_key() -> None:
    bad = {"X-API-Key": "not-the-key"}
    assert client.post("/v1/graph", json={}, headers=bad).status_code == 401


def test_plan_flow() -> None:
    graph = {
        "depots": [
            {"id": "a", "name": "A", "latitude": 0, "longitude": 0},
            {"id": "b", "name": "B", "latitude": 1, "longitude": 1},
        ],
        "routes": [
            {"id": "ab", "origin_id": "a", "destination_id": "b", "cost": 4, "time_hours": 1}
        ],
    }
    assert client.post("/v1/graph", json=graph, headers=headers).status_code == 200
    shipment = {
        "id": "s1",
        "origin_id": "a",
        "destination_id": "b",
        "goods_type": "general",
        "weight_kg": 1,
    }
    assert client.post("/v1/shipments", json=[shipment], headers=headers).status_code == 200
    response = client.post("/v1/plan", json={"shipment_id": "s1"}, headers=headers)
    assert response.status_code == 200
    plans = response.json()
    assert isinstance(plans, list)
    assert any(plan["total_cost"] == 4 for plan in plans)


def test_pareto_returns_frontier() -> None:
    graph = {
        "depots": [
            {"id": "a", "name": "A", "latitude": 0, "longitude": 0},
            {"id": "b", "name": "B", "latitude": 1, "longitude": 1},
        ],
        "routes": [
            {"id": "ab", "origin_id": "a", "destination_id": "b", "cost": 4, "time_hours": 1}
        ],
    }
    assert client.post("/v1/graph", json=graph, headers=headers).status_code == 200
    shipment = {
        "id": "s1",
        "origin_id": "a",
        "destination_id": "b",
        "goods_type": "general",
        "weight_kg": 1,
    }
    assert client.post("/v1/shipments", json=[shipment], headers=headers).status_code == 200
    assert client.post("/v1/plan", json={"shipment_id": "s1"}, headers=headers).status_code == 200
    response = client.get("/v1/pareto", headers=headers)
    assert response.status_code == 200
    plans = response.json()
    assert isinstance(plans, list)
    assert len(plans) >= 1


def test_compare_algorithms() -> None:
    graph = {
        "depots": [
            {"id": "a", "name": "A", "latitude": 28.6, "longitude": 77.2},
            {"id": "b", "name": "B", "latitude": 19.0, "longitude": 72.8},
        ],
        "routes": [
            {"id": "ab", "origin_id": "a", "destination_id": "b", "cost": 10, "time_hours": 5}
        ],
    }
    assert client.post("/v1/graph", json=graph, headers=headers).status_code == 200
    shipment = {
        "id": "s_comp",
        "origin_id": "a",
        "destination_id": "b",
        "goods_type": "general",
        "weight_kg": 1,
    }
    assert client.post("/v1/shipments", json=[shipment], headers=headers).status_code == 200
    res = client.post("/v1/plan/compare", json={"shipment_id": "s_comp"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 6
    bfs_result = next(r for r in data if r["algorithm"] == "bfs")
    assert bfs_result["path"] == ["a", "b"]
    assert bfs_result["cost"] == 10


def test_plan_trace() -> None:
    res = client.post(
        "/v1/plan/trace",
        json={"shipment_id": "s_comp", "algorithm": "ucs"},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["algorithm"] == "ucs"
    assert data["final_path"] == ["a", "b"]
    assert data["final_cost"] == 10
    assert len(data["steps"]) >= 1
