# Implementation plan

## Core objective

Build a reproducible, single-tenant logistics planning system that produces feasible shipment routes, quantifies their disruption regret, proposes cost/resilience trade-offs, replans after events, and records a like-for-like OR-Tools comparison. OR-Tools is a baseline only—not part of AEGIS plan generation.

## Phase 1 — repository, contracts, and local platform

1. Establish the monorepo boundaries: `core` has no framework or OR-Tools dependency; API, worker, SDK, and dashboard only consume its public models.
2. Bring up PostgreSQL, Redis, API, worker, and dashboard with Compose; add `.env` configuration and API-key authentication.
3. Create Pydantic request/domain schemas and SQLAlchemy records for depots, routes, shipments, plans, stops, disruptions, and benchmarks; generate the first Alembic migration.
4. Add `run_id` propagation, structured logs, tracing spans, and Prometheus counters before worker workflows become complex.
5. Define deterministic JSON fixtures for the weather, strike, and head-to-head cases.

Acceptance: a clone starts locally, authenticated API docs load, and all domain input is validated.

## Phase 2 — deterministic classical planning MVP

1. Implement BFS, DFS, UCS, A*, greedy best-first, hill climbing, and random-restart route/schedule search in `aegis_core.algorithms`.
2. Build the in-memory directed transport graph from relational data at run start, with great-circle admissible A* heuristic.
3. Add forward-chaining compliance rules for goods restrictions and deadline/weight feasibility checks.
4. Implement the bounded-regret objective, candidate-plan generation at several risk weights, and Pareto non-dominance filtering.
5. Persist plans and ordered `plan_stops`; dispatch planning as a Celery job, returning job/run identifiers.

Acceptance: an API request produces feasible plans and a non-dominated cost-versus-regret frontier without calling OR-Tools.

## Phase 3 — risk, disruption, and incremental replanning

1. Model route-risk priors and disruption evidence in a Bayesian-network representation; implement exact variable elimination for bounded graphs.
2. Implement manual, historical, and sampled event ingestion with idempotency keys and source attribution.
3. Mark affected plans invalidated, preserve unaffected route prefixes where possible, and replan only remaining shipments/segments.
4. Publish lifecycle events (`plan_started`, `disruption_injected`, `replan_started`, `replan_finalized`) via Redis/WebSocket.
5. Record disruption-to-finalized-replan latency and distinguish an infeasible graph from a worker failure.

Acceptance: closing an edge visibly changes the route and produces a persisted, traceable replan.

## Phase 4 — benchmark harness and honest evaluation

1. Write a separate OR-Tools adapter in the worker that transforms the same normalized instance, constraints, and objective assumptions.
2. Run AEGIS and OR-Tools under identical injected scenario sets; persist both costs, regrets, feasibility, seed, version, and timing in `benchmark_runs`.
3. Compute cost delta, regret-vs-oracle delta, confidence intervals, and null-result-friendly reports.
4. Add regression fixtures and exportable benchmark reports; never compare unlike-for-like constraints.

Acceptance: every displayed claim links to a queryable benchmark record, including AEGIS losses.

## Phase 5 — adversary and curriculum research extension

1. Implement bounded minimax and alpha-beta disruption/planner games; verify against hand-computed game trees.
2. Add evolutionary disruption search and equal-budget random baseline, with fixed seeds and diversity constraints.
3. Measure curriculum quality as induced regret over equal compute, and run ablations: no-adversary, no-compliance, random curriculum, full versus incremental replan.
4. Add GraphPlan-lite, partial-order multi-shipment scheduling, and conditional plans as independently testable planner modules.
5. Treat a null result as a valid result in the evaluation/reporting API.

## Phase 6 — dashboard, SDK, hardening, and release

1. Complete the route map, event console, frontier chart, and curriculum viewer; stream live worker events.
2. Complete the SDK’s WebSocket iterator and typed responses, and publish API reference/examples.
3. Add unit/property/correctness tests, PostgreSQL/Redis integration tests with testcontainers, security/error-path tests, and load-sized synthetic fixtures.
4. Run lint, typecheck, tests, and image builds in CI; write deployment, rollback, and data-retention documentation.

## Key risks and edge cases

- A disruption can isolate a destination; return an explicit infeasible outcome, not a fabricated route.
- Cost and resilience are in different units: define regret precisely and preserve the scenario/seed/oracle used for it.
- A route can be physically available but prohibited for a shipment’s goods; compliance filtering precedes search.
- Avoid double-counting correlated disruption risk in the Bayesian model; independent-union is an MVP approximation only.
- Incremental replanning must account for already-completed stops, shipment location, and frozen commitments.
- OR-Tools comparisons are invalid if capacity, deadline, constraints, cost scaling, or disruption set differ.
- Minimax explodes combinatorially; retain it for bounded instances and use evolutionary search at scale.
- WebSocket consumers must tolerate duplicate/out-of-order events and reconnect from a run cursor.
