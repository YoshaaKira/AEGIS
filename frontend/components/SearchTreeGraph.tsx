"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { GraphInput } from "../lib/api";
import { ALGORITHM_META } from "../lib/constants";

interface TraceStep {
  step: number;
  node: string;
  parent: string | null;
  cost_so_far: number;
  frontier_size: number;
  is_goal: boolean;
}

interface Props {
  graph: GraphInput;
  source: string | null;
  destination: string | null;
  algorithm: string;
}

type NodeState = "unexplored" | "frontier" | "explored" | "current" | "goal" | "path";

/**
 * Animated force-directed search tree visualization.
 * Simulates algorithm exploration step by step.
 */
export function SearchTreeGraph({ graph, source, destination, algorithm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(500);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [finalPath, setFinalPath] = useState<string[]>([]);

  // Simulate search trace locally (client-side BFS/DFS/UCS simulation)
  const simulateTrace = useCallback(() => {
    if (!source || !destination) return;

    const adj: Record<string, { neighbor: string; cost: number }[]> = {};
    for (const route of graph.routes) {
      if (!adj[route.origin_id]) adj[route.origin_id] = [];
      adj[route.origin_id].push({ neighbor: route.destination_id, cost: route.cost });
    }

    const steps: TraceStep[] = [];
    let path: string[] = [];

    if (algorithm === "bfs") {
      // BFS simulation
      const queue: { node: string; parent: string | null; path: string[] }[] = [
        { node: source, parent: null, path: [source] },
      ];
      const seen = new Set([source]);
      let step = 0;

      while (queue.length > 0) {
        const { node, parent, path: curPath } = queue.shift()!;
        const isGoal = node === destination;
        steps.push({ step: step++, node, parent, cost_so_far: 0, frontier_size: queue.length, is_goal: isGoal });
        if (isGoal) { path = curPath; break; }
        for (const { neighbor } of adj[node] || []) {
          if (!seen.has(neighbor)) {
            seen.add(neighbor);
            queue.push({ node: neighbor, parent: node, path: [...curPath, neighbor] });
          }
        }
      }
    } else if (algorithm === "dfs") {
      // DFS simulation
      const stack: { node: string; parent: string | null; path: string[] }[] = [
        { node: source, parent: null, path: [source] },
      ];
      const seen = new Set([source]);
      let step = 0;

      while (stack.length > 0) {
        const { node, parent, path: curPath } = stack.pop()!;
        const isGoal = node === destination;
        steps.push({ step: step++, node, parent, cost_so_far: 0, frontier_size: stack.length, is_goal: isGoal });
        if (isGoal) { path = curPath; break; }
        for (const { neighbor } of (adj[node] || []).reverse()) {
          if (!seen.has(neighbor)) {
            seen.add(neighbor);
            stack.push({ node: neighbor, parent: node, path: [...curPath, neighbor] });
          }
        }
      }
    } else {
      // UCS / A* simulation
      const pq: { cost: number; node: string; parent: string | null; path: string[] }[] = [
        { cost: 0, node: source, parent: null, path: [source] },
      ];
      const best: Record<string, number> = { [source]: 0 };
      let step = 0;

      while (pq.length > 0) {
        pq.sort((a, b) => a.cost - b.cost);
        const { cost, node, parent, path: curPath } = pq.shift()!;
        if (cost > (best[node] ?? Infinity)) continue;
        const isGoal = node === destination;
        steps.push({ step: step++, node, parent, cost_so_far: cost, frontier_size: pq.length, is_goal: isGoal });
        if (isGoal) { path = curPath; break; }
        for (const { neighbor, cost: edgeCost } of adj[node] || []) {
          const nc = cost + edgeCost;
          if (nc < (best[neighbor] ?? Infinity)) {
            best[neighbor] = nc;
            pq.push({ cost: nc, node: neighbor, parent: node, path: [...curPath, neighbor] });
          }
        }
      }
    }

    setTrace(steps);
    setFinalPath(path);
    setCurrentStep(0);
    setPlaying(false);
  }, [graph, source, destination, algorithm]);

  useEffect(() => {
    simulateTrace();
  }, [simulateTrace]);

  // Playback
  useEffect(() => {
    if (!playing || currentStep >= trace.length) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [playing, currentStep, trace.length, speed]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Clear light mode canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Compute positions (force-layout approximation using depot coords)
    const lats = graph.depots.map((d) => d.latitude);
    const lons = graph.depots.map((d) => d.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const latR = Math.max(maxLat - minLat, 0.01);
    const lonR = Math.max(maxLon - minLon, 0.01);
    const pad = 50;

    const pos: Record<string, { x: number; y: number }> = {};
    for (const depot of graph.depots) {
      pos[depot.id] = {
        x: pad + ((depot.longitude - minLon) / lonR) * (W - 2 * pad),
        y: H - pad - ((depot.latitude - minLat) / latR) * (H - 2 * pad),
      };
    }

    // Determine node states
    const exploredNodes = new Set(trace.slice(0, currentStep).map((s) => s.node));
    const currentNode = currentStep > 0 ? trace[currentStep - 1]?.node : null;
    const isComplete = currentStep >= trace.length;
    const pathSet = new Set(isComplete ? finalPath : []);

    const getState = (id: string): NodeState => {
      if (isComplete && pathSet.has(id)) return "path";
      if (id === currentNode) return "current";
      if (id === destination && exploredNodes.has(id)) return "goal";
      if (exploredNodes.has(id)) return "explored";
      return "unexplored";
    };

    // Strict 4-color palette in light mode
    const stateColors: Record<NodeState, string> = {
      unexplored: "#e2e8f0",
      frontier: "#94a3b8",
      explored: "#64748b",
      current: "#0f172a",
      goal: "#dc2626",
      path: "#2563eb",
    };

    // Draw edges
    for (const route of graph.routes) {
      const from = pos[route.origin_id];
      const to = pos[route.destination_id];
      if (!from || !to) continue;

      const onPath = isComplete && pathSet.has(route.origin_id) && pathSet.has(route.destination_id) &&
        finalPath.indexOf(route.destination_id) === finalPath.indexOf(route.origin_id) + 1;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = onPath ? "#2563eb" : "rgba(203, 213, 225, 0.8)";
      ctx.lineWidth = onPath ? 3.5 : 1.2;
      ctx.stroke();

      // Arrow
      if (onPath) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        ctx.beginPath();
        ctx.moveTo(mx + 8 * Math.cos(angle), my + 8 * Math.sin(angle));
        ctx.lineTo(mx - 6 * Math.cos(angle - 0.5), my - 6 * Math.sin(angle - 0.5));
        ctx.lineTo(mx - 6 * Math.cos(angle + 0.5), my - 6 * Math.sin(angle + 0.5));
        ctx.closePath();
        ctx.fillStyle = "#2563eb";
        ctx.fill();
      }
    }

    // Draw nodes
    for (const depot of graph.depots) {
      const p = pos[depot.id];
      const state = getState(depot.id);
      const color = stateColors[state];
      const r = state === "current" ? 14 : state === "path" || state === "goal" ? 12 : 8;

      // Glow for current/path
      if (state === "current" || state === "path" || state === "goal") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = color + "22";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = state === "unexplored" ? "#cbd5e1" : "#ffffff";
      ctx.lineWidth = state === "current" ? 3 : 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = state === "unexplored" ? "#94a3b8" : "#0f172a";
      ctx.font = `${state === "current" || state === "path" ? "bold " : ""}11px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(depot.name, p.x, p.y + r + 14);
    }

    // Step info
    ctx.fillStyle = "#64748b";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `Step ${currentStep}/${trace.length} · ${ALGORITHM_META[algorithm]?.label || algorithm}`,
      12,
      H - 12
    );

    if (isComplete && finalPath.length > 0) {
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Path: ${finalPath.map((id) => graph.depots.find((d) => d.id === id)?.name || id).join(" → ")}`, W - 12, H - 12);
    }
  }, [graph, trace, currentStep, finalPath, destination, algorithm]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: 360,
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (currentStep >= trace.length) {
              setCurrentStep(0);
            }
            setPlaying(!playing);
          }}
        >
          {playing ? "⏸ Pause" : currentStep >= trace.length ? "🔄 Replay" : "▶ Play"}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setCurrentStep((s) => Math.min(s + 1, trace.length))}
          disabled={playing || currentStep >= trace.length}
        >
          Step →
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setCurrentStep(0); setPlaying(false); }}
        >
          Reset
        </button>
        <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          Speed:
          <input
            type="range"
            className="form-range"
            style={{ width: 80 }}
            min={50}
            max={1000}
            step={50}
            value={1050 - speed}
            onChange={(e) => setSpeed(1050 - parseInt(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
