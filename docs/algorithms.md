# Algorithms

The MVP uses uniform-cost graph search where edge cost is `base_cost × (1 + risk_weight × route_risk)`. Route risk combines its prior and active disruption evidence using an independent-event union. This is a documented interim model; Phase 3 replaces it with an explicitly structured Bayesian network and variable elimination.

The Pareto frontier removes any plan for which another plan is no more expensive and no more regretful, with at least one strict improvement. The core library intentionally contains no OR-Tools imports.

For bounded adversarial instances, minimax chooses a disruption maximizing planner loss and planner choices minimize it; alpha-beta prunes equivalent branches. For larger scenario spaces, evolutionary search is evaluated against an equal-budget random baseline.
