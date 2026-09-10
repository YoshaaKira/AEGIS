# AEGIS — resilience-aware logistics planning

> **AEGIS is a planning layer, not a replacement for OR-Tools.** It generates and stress-tests resilient routes, then compares them honestly to OR-Tools on the same instances.

AEGIS answers: *how badly does a feasible delivery plan fail when conditions change, and what cost premium buys less failure?*

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:3000`. The API is at `http://localhost:8000/docs`; use `X-API-Key: local-dev-key`.

For local Python development:

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ./core -e ./sdk -r services/api/requirements.txt -r services/worker/requirements.txt
uvicorn services.api.app.main:app --reload
```

## Architecture

```text
Next.js dashboard / Python SDK → FastAPI → Redis/Celery workers
                                        ↘ PostgreSQL
                                         ↘ aegis_core (search, risk, adversary, replanning)
                                         ↘ OR-Tools (benchmark only)
```

`aegis_core` never imports OR-Tools. The worker’s benchmark adapter is the only comparison integration.

## Included examples

- `examples/last_mile_weather.json`
- `examples/multi_depot_strike.json`
- `examples/ortools_head_to_head.py`

See [docs/implementation-plan.md](docs/implementation-plan.md), [docs/architecture.md](docs/architecture.md), and [docs/algorithms.md](docs/algorithms.md).
