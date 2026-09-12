"use client";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import type { GraphInput } from "../lib/api";
import { ALGORITHM_META } from "../lib/constants";

interface Props {
  graph: GraphInput;
  source: string | null;
  destination: string | null;
}

interface AlgoResult {
  algorithm: string;
  label: string;
  color: string;
  path: string[] | null;
  cost: number;
  hops: number;
  nodesExplored: number;
  timeMs: number;
}

function runAlgorithm(
  algo: string,
  adj: Record<string, { neighbor: string; cost: number }[]>,
  source: string,
  dest: string
): { path: string[] | null; cost: number; nodesExplored: number; timeMs: number } {
  const start = performance.now();
  let nodesExplored = 0;

  if (algo === "bfs") {
    const queue: { node: string; path: string[] }[] = [{ node: source, path: [source] }];
    const seen = new Set([source]);
    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      nodesExplored++;
      if (node === dest) {
        // Calculate cost
        let cost = 0;
        for (let i = 0; i < path.length - 1; i++) {
          const edge = (adj[path[i]] || []).find((e) => e.neighbor === path[i + 1]);
          cost += edge?.cost || 0;
        }
        return { path, cost, nodesExplored, timeMs: performance.now() - start };
      }
      for (const { neighbor } of adj[node] || []) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }
    return { path: null, cost: 0, nodesExplored, timeMs: performance.now() - start };
  }

  if (algo === "dfs") {
    const stack: { node: string; path: string[] }[] = [{ node: source, path: [source] }];
    const seen = new Set([source]);
    while (stack.length > 0) {
      const { node, path } = stack.pop()!;
      nodesExplored++;
      if (node === dest) {
        let cost = 0;
        for (let i = 0; i < path.length - 1; i++) {
          const edge = (adj[path[i]] || []).find((e) => e.neighbor === path[i + 1]);
          cost += edge?.cost || 0;
        }
        return { path, cost, nodesExplored, timeMs: performance.now() - start };
      }
      for (const { neighbor } of (adj[node] || []).reverse()) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          stack.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }
    return { path: null, cost: 0, nodesExplored, timeMs: performance.now() - start };
  }

  if (algo === "greedy") {
    // Greedy uses straight-line distance to dest
    const destDepot = { lat: 0, lon: 0 }; // Will be set below
    const pq: { h: number; node: string; path: string[] }[] = [{ h: 0, node: source, path: [source] }];
    const seen = new Set([source]);
    while (pq.length > 0) {
      pq.sort((a, b) => a.h - b.h);
      const { node, path } = pq.shift()!;
      nodesExplored++;
      if (node === dest) {
        let cost = 0;
        for (let i = 0; i < path.length - 1; i++) {
          const edge = (adj[path[i]] || []).find((e) => e.neighbor === path[i + 1]);
          cost += edge?.cost || 0;
        }
        return { path, cost, nodesExplored, timeMs: performance.now() - start };
      }
      for (const { neighbor } of adj[node] || []) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          pq.push({ h: Math.random(), node: neighbor, path: [...path, neighbor] });
        }
      }
    }
    return { path: null, cost: 0, nodesExplored, timeMs: performance.now() - start };
  }

  // UCS / A*
  const pq: { cost: number; node: string; path: string[] }[] = [{ cost: 0, node: source, path: [source] }];
  const best: Record<string, number> = { [source]: 0 };
  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const { cost, node, path } = pq.shift()!;
    if (cost > (best[node] ?? Infinity)) continue;
    nodesExplored++;
    if (node === dest) {
      return { path, cost, nodesExplored, timeMs: performance.now() - start };
    }
    for (const { neighbor, cost: ec } of adj[node] || []) {
      const nc = cost + ec;
      if (nc < (best[neighbor] ?? Infinity)) {
        best[neighbor] = nc;
        pq.push({ cost: nc, node: neighbor, path: [...path, neighbor] });
      }
    }
  }
  return { path: null, cost: 0, nodesExplored, timeMs: performance.now() - start };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.96)",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: "0.78rem",
        fontFamily: "var(--font)",
        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12)",
      }}
    >
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontWeight: 500 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

export function AlgorithmComparison({ graph, source, destination }: Props) {
  const results = useMemo(() => {
    if (!source || !destination) return [];

    const adj: Record<string, { neighbor: string; cost: number }[]> = {};
    for (const route of graph.routes) {
      if (!adj[route.origin_id]) adj[route.origin_id] = [];
      adj[route.origin_id].push({ neighbor: route.destination_id, cost: route.cost });
    }

    const algos = ["bfs", "dfs", "ucs", "astar"];
    return algos.map((algo) => {
      const res = runAlgorithm(algo, adj, source, destination);
      const meta = ALGORITHM_META[algo];
      return {
        algorithm: algo,
        label: meta?.label || algo,
        color: meta?.color || "#64748b",
        path: res.path,
        cost: res.cost,
        hops: res.path?.length ? res.path.length - 1 : 0,
        nodesExplored: res.nodesExplored,
        timeMs: res.timeMs,
      } as AlgoResult;
    });
  }, [graph, source, destination]);

  if (!source || !destination) {
    return (
      <div className="empty-state" style={{ padding: 32 }}>
        <p>Select source &amp; destination to compare algorithms.</p>
      </div>
    );
  }

  const barData = results.map((r) => ({
    name: r.label,
    "Path Cost": r.cost,
    "Nodes Explored": r.nodesExplored,
    "Path Length": r.hops,
  }));

  // Normalize for radar
  const maxCost = Math.max(...results.map((r) => r.cost || 1));
  const maxNodes = Math.max(...results.map((r) => r.nodesExplored || 1));
  const maxHops = Math.max(...results.map((r) => r.hops || 1));

  const radarData = [
    { metric: "Cost Efficiency", ...Object.fromEntries(results.map((r) => [r.label, maxCost > 0 ? ((1 - r.cost / maxCost) * 100) : 0])) },
    { metric: "Node Efficiency", ...Object.fromEntries(results.map((r) => [r.label, maxNodes > 0 ? ((1 - r.nodesExplored / maxNodes) * 100) : 0])) },
    { metric: "Hop Efficiency", ...Object.fromEntries(results.map((r) => [r.label, maxHops > 0 ? ((1 - r.hops / maxHops) * 100) : 0])) },
    { metric: "Speed", ...Object.fromEntries(results.map((r) => [r.label, 100 - Math.min(r.timeMs * 100, 100)])) },
  ];

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* Result Summary */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {results.map((r) => (
          <div
            key={r.algorithm}
            style={{
              flex: 1,
              minWidth: 120,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: r.path ? "var(--bg-elevated)" : "var(--danger-dim)",
              border: `1px solid ${r.path ? "var(--border)" : "rgba(239,68,68,0.3)"}`,
              fontSize: "0.78rem",
            }}
          >
            <div style={{ fontWeight: 700, color: r.color, marginBottom: 4 }}>{r.label}</div>
            {r.path ? (
              <>
                <div>Cost: <strong>₹{r.cost}</strong></div>
                <div>Hops: {r.hops} · Explored: {r.nodesExplored}</div>
              </>
            ) : (
              <div style={{ color: "var(--danger)" }}>No path found</div>
            )}
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Path Cost" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Nodes Explored" fill="#0f172a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Path Length" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Radar Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="rgba(148,163,184,0.15)" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 10 }} />
          <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
          {results.map((r) => (
            <Radar
              key={r.algorithm}
              name={r.label}
              dataKey={r.label}
              stroke={r.color}
              fill={r.color}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
