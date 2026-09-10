from __future__ import annotations

import heapq
from collections import deque
from collections.abc import Callable
from typing import TypeVar

Node = TypeVar("Node", bound=str)
Neighbors = Callable[[Node], list[tuple[Node, float]]]


def bfs(start: Node, goal: Node, neighbors: Neighbors[Node]) -> list[Node] | None:
    queue: deque[tuple[Node, list[Node]]] = deque([(start, [start])])
    seen = {start}
    while queue:
        node, path = queue.popleft()
        if node == goal:
            return path
        for child, _ in neighbors(node):
            if child not in seen:
                seen.add(child)
                queue.append((child, path + [child]))
    return None


def ucs(start: Node, goal: Node, neighbors: Neighbors[Node], heuristic: Callable[[Node], float] | None = None) -> tuple[list[Node], float] | None:
    heuristic = heuristic or (lambda _: 0.0)
    frontier: list[tuple[float, float, Node, list[Node]]] = [(heuristic(start), 0.0, start, [start])]
    best: dict[Node, float] = {start: 0.0}
    while frontier:
        _, cost, node, path = heapq.heappop(frontier)
        if node == goal:
            return path, cost
        if cost > best.get(node, float("inf")):
            continue
        for child, edge_cost in neighbors(node):
            candidate = cost + edge_cost
            if candidate < best.get(child, float("inf")):
                best[child] = candidate
                heapq.heappush(frontier, (candidate + heuristic(child), candidate, child, path + [child]))
    return None
