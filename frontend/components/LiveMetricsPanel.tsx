"use client";
import { useEffect, useState, useRef } from "react";
import { Wifi, WifiOff, Activity } from "lucide-react";
import type { SimulationEvent } from "../lib/api";

const EVENT_COLORS: Record<string, string> = {
  connected: "#2563eb",
  heartbeat: "#64748b",
  plan_started: "#2563eb",
  disruption_injected: "#dc2626",
  replan_started: "#0f172a",
  replan_finalized: "#2563eb",
};

const EVENT_LABELS: Record<string, string> = {
  connected: "Connected",
  heartbeat: "Heartbeat",
  plan_started: "Plan Started",
  disruption_injected: "Disruption",
  replan_started: "Replan Started",
  replan_finalized: "Replan Done",
};

export function LiveMetricsPanel() {
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({
    plans: 0,
    disruptions: 0,
    replans: 0,
  });
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wsUrl = (
      process.env.NEXT_PUBLIC_WS_URL ??
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws")
    );

    let ws: WebSocket;
    try {
      ws = new WebSocket(`${wsUrl}/v1/stream/simulation`);
    } catch {
      setError("Cannot connect to WebSocket");
      return;
    }

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError("WebSocket connection failed");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SimulationEvent;
        setEvents((prev) => [...prev.slice(-49), data]);
        if (data.type === "plan_started") setCounts((c) => ({ ...c, plans: c.plans + 1 }));
        if (data.type === "disruption_injected") setCounts((c) => ({ ...c, disruptions: c.disruptions + 1 }));
        if (data.type === "replan_finalized") setCounts((c) => ({ ...c, replans: c.replans + 1 }));
      } catch {}
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [events]);

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Counters */}
      <div className="metric-grid">
        <div className="metric-card" style={{ borderLeft: "3px solid var(--accent)" }}>
          <div className="metric-label">Plans Generated</div>
          <div className="metric-value" style={{ fontSize: "1.4rem" }}>{counts.plans}</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "3px solid var(--danger)" }}>
          <div className="metric-label">Disruptions</div>
          <div className="metric-value" style={{ fontSize: "1.4rem" }}>{counts.disruptions}</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "3px solid var(--text-secondary)" }}>
          <div className="metric-label">Replans</div>
          <div className="metric-value" style={{ fontSize: "1.4rem" }}>{counts.replans}</div>
        </div>
      </div>

      {/* Stream */}
      <div className="event-console">
        <div className="console-header">
          {connected ? <Wifi size={14} style={{ color: "#2563eb" }} /> : <WifiOff size={14} style={{ color: "#dc2626" }} />}
          <span className="status-text">{connected ? "Live Telemetry" : "Disconnected"}</span>
          {error && <span className="error-text">{error}</span>}
          <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--text-dim)" }}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="event-list" ref={listRef}>
          {events.length === 0 && (
            <p className="muted" style={{ textAlign: "center", padding: 20 }}>
              <Activity size={16} style={{ marginBottom: 4, opacity: 0.4 }} /><br />
              Waiting for events…
            </p>
          )}
          {events.map((event, index) => (
            <div key={index} className="event-item">
              <span
                className="status-dot"
                style={{ background: EVENT_COLORS[event.type] || "#64748b", flexShrink: 0 }}
              />
              <span
                className="event-type"
                style={{ color: EVENT_COLORS[event.type] || "#64748b", minWidth: 120 }}
              >
                {EVENT_LABELS[event.type] || event.type}
              </span>
              <span className="event-time">{new Date().toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
