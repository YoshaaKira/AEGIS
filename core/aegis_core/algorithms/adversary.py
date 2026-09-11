from __future__ import annotations

from collections.abc import Callable


def minimax(
    state: str,
    depth: int,
    maximizing: bool,
    children: Callable[[str], list[str]],
    value: Callable[[str], float],
) -> float:
    if depth == 0:
        return value(state)
    moves = children(state)
    if not moves:
        return value(state)
    scores = [minimax(child, depth - 1, not maximizing, children, value) for child in moves]
    return max(scores) if maximizing else min(scores)


def alpha_beta(
    state: str,
    depth: int,
    maximizing: bool,
    children: Callable[[str], list[str]],
    value: Callable[[str], float],
    alpha: float = float("-inf"),
    beta: float = float("inf"),
) -> float:
    if depth == 0 or not children(state):
        return value(state)
    if maximizing:
        for child in children(state):
            alpha = max(alpha, alpha_beta(child, depth - 1, False, children, value, alpha, beta))
            if alpha >= beta:
                break
        return alpha
    for child in children(state):
        beta = min(beta, alpha_beta(child, depth - 1, True, children, value, alpha, beta))
        if alpha >= beta:
            break
    return beta
