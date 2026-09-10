from __future__ import annotations

from aegis_core.domain.models import Disruption, Route


def edge_risk(route: Route, disruptions: list[Disruption]) -> float:
    """Independent-event Bayesian-style union of route prior and active disruption risk."""
    probabilities = [route.risk_prior] + [d.severity for d in disruptions if d.edge_id == route.id]
    survival = 1.0
    for probability in probabilities:
        survival *= 1.0 - probability
    return 1.0 - survival
