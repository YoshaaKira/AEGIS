"use client";
import { useState, useCallback } from "react";
import { SearchTreeGraph } from "../../components/SearchTreeGraph";
import { AlgorithmComparison } from "../../components/AlgorithmComparison";
import { RiskHeatmap } from "../../components/RiskHeatmap";
import { DisruptionSimulator } from "../../components/DisruptionSimulator";
import { MiniGameTree } from "../../components/MiniGameTree";
import { LiveMetricsPanel } from "../../components/LiveMetricsPanel";
import { INDIA_NETWORK, ALGORITHM_META } from "../../lib/constants";
import type { Disruption, GraphInput } from "../../lib/api";
import {
  Brain,
  GitBranch,
  BarChart3,
  Flame,
  Zap,
  Swords,
  Activity,
  MapPin,
} from "lucide-react";

export default function VisualizerPage() {
  const graph: GraphInput = INDIA_NETWORK;

  const [source, setSource] = useState<string | null>("delhi");
  const [destination, setDestination] = useState<string | null>("chennai");
  const [algorithm, setAlgorithm] = useState("bfs");
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);

  const handleInjectDisruption = useCallback((d: Disruption) => {
    setDisruptions((prev) => [...prev, d]);
  }, []);

  const handleClearDisruptions = useCallback(() => {
    setDisruptions([]);
  }, []);

  return (
    <main className="page-container">
      {/* Hero */}
      <header className="page-header">
        <div className="eyebrow">
          <Brain size={12} />
          AEGIS Algorithm Visualizer
        </div>
        <h1>How AEGIS thinks.</h1>
        <p>
          Explore search algorithms, compare strategies, inject disruptions, and
          watch adversarial game trees — all in real time.
        </p>
      </header>

      {/* Source/Dest + Algorithm Selector */}
      <div
        className="card"
        style={{ marginBottom: 20, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}
      >
        <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
          <label className="form-label">
            <MapPin size={11} style={{ color: "#2563eb" }} /> Source
          </label>
          <select
            className="form-select"
            value={source || ""}
            onChange={(e) => setSource(e.target.value)}
          >
            {graph.depots.map((d) => (
              <option key={d.id} value={d.id} disabled={d.id === destination}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
          <label className="form-label">
            <MapPin size={11} style={{ color: "#dc2626" }} /> Destination
          </label>
          <select
            className="form-select"
            value={destination || ""}
            onChange={(e) => setDestination(e.target.value)}
          >
            {graph.depots.map((d) => (
              <option key={d.id} value={d.id} disabled={d.id === source}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
          <label className="form-label">
            <GitBranch size={11} /> Search Algorithm
          </label>
          <select
            className="form-select"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
          >
            {Object.entries(ALGORITHM_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: Search Tree + Algorithm Comparison */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <h2>
              <GitBranch size={16} style={{ color: "#2563eb" }} />
              Search Exploration
            </h2>
            <span className="badge badge-accent">{ALGORITHM_META[algorithm]?.label || algorithm}</span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
            {ALGORITHM_META[algorithm]?.description || "Watch the algorithm explore the graph."}
          </p>
          <SearchTreeGraph
            graph={graph}
            source={source}
            destination={destination}
            algorithm={algorithm}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h2>
              <BarChart3 size={16} style={{ color: "#0f172a" }} />
              Algorithm Comparison
            </h2>
          </div>
          <AlgorithmComparison
            graph={graph}
            source={source}
            destination={destination}
          />
        </div>
      </div>

      {/* Row 2: Risk Heatmap + Disruption Simulator */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <h2>
              <Flame size={16} style={{ color: "#dc2626" }} />
              Risk Heatmap
            </h2>
            <span className="badge">
              {disruptions.length > 0
                ? `${disruptions.length} active disruption${disruptions.length > 1 ? "s" : ""}`
                : "Baseline risk"}
            </span>
          </div>
          <RiskHeatmap graph={graph} disruptions={disruptions} />
        </div>

        <div className="card">
          <div className="card-header">
            <h2>
              <Zap size={16} style={{ color: "#dc2626" }} />
              Disruption Simulator
            </h2>
          </div>
          <DisruptionSimulator
            graph={graph}
            disruptions={disruptions}
            onInject={handleInjectDisruption}
            onClear={handleClearDisruptions}
          />
        </div>
      </div>

      {/* Row 3: Minimax Game Tree + Live Metrics */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <h2>
              <Swords size={16} style={{ color: "#0f172a" }} />
              Adversarial Game Tree
            </h2>
            <span className="badge">Alpha-Beta Pruning</span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
            Minimax tree where the <span style={{ color: "#2563eb", fontWeight: 600 }}>planner (MAX)</span> minimizes
            cost while the <span style={{ color: "#dc2626", fontWeight: 600 }}>adversary (MIN)</span> maximizes disruption.
            Pruned branches are crossed out.
          </p>
          <MiniGameTree depth={3} />
        </div>

        <div className="card">
          <div className="card-header">
            <h2>
              <Activity size={16} style={{ color: "#2563eb" }} />
              Live Telemetry
            </h2>
          </div>
          <LiveMetricsPanel />
        </div>
      </div>
    </main>
  );
}
