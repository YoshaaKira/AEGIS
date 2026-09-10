from __future__ import annotations

from aegis_core.domain.models import Plan


def frontier(plans: list[Plan]) -> list[Plan]:
    """Return non-dominated plans: lower cost and lower expected regret are preferred."""
    return [
        plan for plan in plans
        if not any(
            (other.total_cost <= plan.total_cost and other.expected_regret <= plan.expected_regret)
            and (other.total_cost < plan.total_cost or other.expected_regret < plan.expected_regret)
            for other in plans
            if other.id != plan.id
        )
    ]
