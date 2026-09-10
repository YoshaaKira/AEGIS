# Architecture

The project is a Python-first monorepo:

| Area | Responsibility |
|---|---|
| `core/aegis_core` | Pure domain models, search, risk, compliance, adversarial logic, Pareto filtering |
| `services/api` | FastAPI auth, validation, routes, repository adapters, metrics and WebSockets |
| `services/worker` | Celery task dispatch, stress tests, and the isolated OR-Tools benchmark adapter |
| `sdk/aegis_sdk` | One-to-one typed HTTP client |
| `frontend` | Next.js dashboard for frontier, map, and disruption feed |

PostgreSQL is the system of record. Redis is the task broker, cache, and pub/sub relay. A graph is reconstructed into a per-run adjacency list—there is deliberately no graph database.

## API reference

All routes are prefixed `/v1` and require `X-API-Key`, except the WebSocket handshake policy that should be finalized before production.

| Method | Route | Result |
|---|---|---|
| POST | `/graph` | validate/store depots and routes |
| POST | `/shipments` | validate/store shipments |
| POST | `/plan` | generate a candidate plan |
| POST | `/disrupt` | append a disruption event |
| POST | `/plan/{id}/replan` | plan on post-event topology |
| GET | `/benchmark/ortools?plan_id=` | AEGIS vs OR-Tools benchmark record |
| GET | `/pareto` | non-dominated plans |
| WS | `/stream/simulation` | simulation lifecycle events |
| GET | `/metrics` | Prometheus exposition |
