"use client";
import { useState } from "react";
import { Zap, AlertTriangle } from "lucide-react";
import type { GraphInput, Disruption } from "../lib/api";

interface Props {
  graph: GraphInput;
  disruptions: Disruption[];
  onInject: (d: Disruption) => void;
  onClear: () => void;
}

export function DisruptionSimulator({ graph, disruptions, onInject, onClear }: Props) {
  const [edgeId, setEdgeId] = useState(graph.routes[0]?.id || "");
  const [severity, setSeverity] = useState(0.5);
  const [type, setType] = useState("weather");

  const handleInject = () => {
    onInject({
      type,
      edge_id: edgeId,
      severity,
      source: "simulator",
    });
  };

  const route = graph.routes.find((r) => r.id === edgeId);
  const originName = route ? graph.depots.find((d) => d.id === route.origin_id)?.name : "";
  const destName = route ? graph.depots.find((d) => d.id === route.destination_id)?.name : "";

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Controls */}
      <div className="form-group">
        <label className="form-label">Target Route</label>
        <select
          className="form-select"
          value={edgeId}
          onChange={(e) => setEdgeId(e.target.value)}
        >
          {graph.routes.map((r) => {
            const o = graph.depots.find((d) => d.id === r.origin_id)?.name || r.origin_id;
            const d = graph.depots.find((dep) => dep.id === r.destination_id)?.name || r.destination_id;
            return (
              <option key={r.id} value={r.id}>
                {r.id}: {o} → {d} (risk: {(r.risk_prior * 100).toFixed(0)}%)
              </option>
            );
          })}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Disruption Type</label>
        <select
          className="form-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="weather">🌧 Weather</option>
          <option value="strike">✊ Strike</option>
          <option value="road_closure">🚧 Road Closure</option>
          <option value="accident">💥 Accident</option>
          <option value="flood">🌊 Flood</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">
          Severity: {(severity * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          className="form-range"
          min={0.1}
          max={1.0}
          step={0.1}
          value={severity}
          onChange={(e) => setSeverity(parseFloat(e.target.value))}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 4 }}>
          <span>Minor</span>
          <span>Complete block</span>
        </div>
      </div>

      {route && (
        <div
          style={{
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            padding: "8px 12px",
            background: "var(--danger-dim)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
          }}
        >
          <AlertTriangle size={12} style={{ color: "var(--danger)", marginRight: 4 }} />
          Will inject <strong>{type}</strong> on{" "}
          <strong>{originName} → {destName}</strong> at{" "}
          <strong>{(severity * 100).toFixed(0)}%</strong> severity
        </div>
      )}

      <div className="btn-group">
        <button className="btn btn-danger btn-sm" onClick={handleInject} style={{ flex: 1 }}>
          <Zap size={14} /> Inject Disruption
        </button>
        {disruptions.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={onClear}>
            Clear All ({disruptions.length})
          </button>
        )}
      </div>

      {/* Active disruptions list */}
      {disruptions.length > 0 && (
        <div style={{ fontSize: "0.78rem" }}>
          <div style={{ fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Active Disruptions
          </div>
          {disruptions.map((d, i) => {
            const r = graph.routes.find((route) => route.id === d.edge_id);
            const oN = r ? graph.depots.find((dep) => dep.id === r.origin_id)?.name : d.edge_id;
            const dN = r ? graph.depots.find((dep) => dep.id === r.destination_id)?.name : "";
            return (
              <div
                key={i}
                className="animate-fade-in"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: "14px" }}>
                  {d.type === "weather" ? "🌧" : d.type === "strike" ? "✊" : d.type === "road_closure" ? "🚧" : d.type === "flood" ? "🌊" : "💥"}
                </span>
                <span style={{ color: "var(--text)" }}>
                  {oN} → {dN}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    color: d.severity >= 0.7 ? "var(--danger)" : "var(--warning)",
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {(d.severity * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
