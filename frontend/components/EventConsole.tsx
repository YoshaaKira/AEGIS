"use client";
import { useEffect, useRef, useState } from "react";
import { SimulationEvent } from "../types";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    .replace(/^http/, "ws");

const EVENT_COLORS: Record<string, string> = {
  connected: "#59d9a9",
  heartbeat: "#9eafa8",
  plan_started: "#59d9a9",
  disruption_injected: "#ffb74d",
  replan_started: "#b6eaca",
  replan_finalized: "#59d9a9",
};

const EVENT_LABELS: Record<string, string> = {
  connected: "Connected",
  heartbeat: "Heartbeat",
  plan_started: "Plan started",
  disruption_injected: "Disruption injected",
  replan_started: "Replan started",
  replan_finalized: "Replan finalized",
};

export function EventConsole() {
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/v1/stream/simulation`);

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = (e) => {
      console.error("WebSocket error:", e);
      setError("WebSocket connection failed");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SimulationEvent;
        setEvents((prev) => [...prev.slice(-99), data]);
      } catch {
        console.error("Failed to parse WS message:", event.data);
      }
    };

    return () => ws.close();
  }, []);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [events]);

  const formatPayload = (payload: Record<string, unknown>): string => {
    if (!payload || Object.keys(payload).length === 0) return "";
    const parts: string[] = [];
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === "object") {
        parts.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        parts.push(`${key}: ${value}`);
      }
    }
    return parts.join(", ");
  };

  return (
    <div className="event-console">
      <div className="console-header">
        <span className="status-dot" style={{ background: connected ? "#59d9a9" : "#e74c3c" }} />
        <span className="status-text">{connected ? "Connected" : "Disconnected"}</span>
        {error && <span className="error-text">{error}</span>}
      </div>
      <div className="event-list" ref={listRef}>
        {events.length === 0 && (
          <p className="muted">No events yet — inject a disruption or request a replan.</p>
        )}
        {events.map((event, index) => (
          <div key={index} className="event-item">
            <span
              className="event-type"
              style={{ color: EVENT_COLORS[event.type] ?? "#9eafa8" }}
            >
              {EVENT_LABELS[event.type] ?? event.type}
            </span>
            <span className="event-time">
              {new Date().toLocaleTimeString()}
            </span>
            {formatPayload(event.payload) && (
              <pre className="event-payload">{formatPayload(event.payload)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
