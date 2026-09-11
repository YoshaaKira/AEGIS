from __future__ import annotations

from aegis_core.domain.models import Plan


def frontier(plans: list[Plan]) -> list[Plan]:
    """Return non-dominated plans: lower cost and lower expected regret are preferred.

    Candidate plans with identical ``(total_cost, expected_regret)`` tuples are
    collapsed to a single representative before the Pareto filter runs.
    """
    deduped: list[Plan] = []
    seen: set[tuple[float, float]] = set()
    for plan in plans:
        key = (plan.total_cost, plan.expected_regret)
        if key not in seen:
            seen.add(key)
            deduped.append(plan)
    return [
        plan for plan in deduped
        if not any(
            (other.total_cost <= plan.total_cost and other.expected_regret <= plan.expected_regret)
            and (other.total_cost < plan.total_cost or other.expected_regret < plan.expected_regret)
            for other in deduped
            if other is not plan
        )
    ]
