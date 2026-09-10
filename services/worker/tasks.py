"""Long-running dispatch boundary. OR-Tools is restricted to benchmark_plan."""

import os

from celery import Celery

celery = Celery("aegis", broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"))


@celery.task(name="aegis.benchmark_plan")
def benchmark_plan(edges: list[tuple[int, int, int]], source: int, destination: int) -> dict[str, float]:
    """Solve a single-source shortest-path baseline with OR-Tools' SimpleMinCostFlow.

    This adapter must only be called by benchmark workflows, never planning workflows.
    """
    from ortools.graph.python import min_cost_flow

    solver = min_cost_flow.SimpleMinCostFlow()
    nodes = {source, destination}
    for start, end, cost in edges:
        solver.add_arc_with_capacity_and_unit_cost(start, end, 1, cost)
        nodes.update((start, end))
    for node in nodes:
        solver.set_node_supply(node, 1 if node == source else -1 if node == destination else 0)
    status = solver.solve()
    if status != solver.OPTIMAL:
        raise ValueError("OR-Tools could not find a feasible benchmark solution")
    return {"ortools_cost": float(solver.optimal_cost())}
