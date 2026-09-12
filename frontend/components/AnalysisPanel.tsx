"use client";
import { useState } from "react";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  Route,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
  TrendingUp,
  Sliders,
} from "lucide-react";
import type { Plan, GraphInput } from "../lib/api";
import { riskColor } from "../lib/constants";
import { TradeoffRadarChart } from "./TradeoffRadarChart";
import { HopBreakdownChart } from "./HopBreakdownChart";
import { TransitProfileChart } from "./TransitProfileChart";

interface Props {
  plans: Plan[];
  graph: GraphInput;
  selectedPlanIndex: number;
  onSelectPlan: (index: number) => void;
}

export function AnalysisPanel({ plans, graph, selectedPlanIndex, onSelectPlan }: Props) {
  const [activeGraphTab, setActiveGraphTab] = useState<"radar" | "hops" | "profile">("radar");

  if (plans.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <Route size={36} style={{ color: "#94a3b8" }} />
          <p style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Select source &amp; destination, then run AEGIS to see dynamic analysis.
          </p>
        </div>
      </div>
    );
  }

  const plan = plans[selectedPlanIndex] || plans[0];
  const routeMap = Object.fromEntries(graph.routes.map((r) => [r.id, r]));

  // Compute totals
  const totalTime = plan.route_ids.reduce((sum, rid) => {
    const r = routeMap[rid];
    return sum + (r ? r.time_hours : 0);
  }, 0);

  const avgRisk =
    plan.route_ids.length > 0
      ? plan.route_ids.reduce((sum, rid) => {
          const r = routeMap[rid];
          return sum + (r ? r.risk_prior : 0);
        }, 0) / plan.route_ids.length
      : 0;

  return (
    <div className="stack">
      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card" style={{ borderLeft: "3px solid #2563eb" }}>
          <div className="metric-label">
            <DollarSign size={12} style={{ color: "#2563eb" }} /> Cost
          </div>
          <div className="metric-value">₹{plan.total_cost.toFixed(1)}</div>
          <div className="metric-sub">{plan.route_ids.length} corridor hops</div>
        </div>

        <div className="metric-card" style={{ borderLeft: "3px solid #dc2626" }}>
          <div className="metric-label">
            <AlertTriangle size={12} style={{ color: "#dc2626" }} /> Regret
          </div>
          <div className="metric-value">{plan.expected_regret.toFixed(2)}</div>
          <div className="metric-sub">Risk: {(avgRisk * 100).toFixed(0)}% avg</div>
        </div>

        <div className="metric-card" style={{ borderLeft: "3px solid #0f172a" }}>
          <div className="metric-label">
            <Clock size={12} style={{ color: "#0f172a" }} /> Time
          </div>
          <div className="metric-value">{totalTime}h</div>
          <div className="metric-sub">Transit est.</div>
        </div>
      </div>

      {/* Plan Selector (if multiple Pareto options) */}
      {plans.length > 1 && (
        <div className="card" style={{ padding: "12px 16px" }}>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <h2 style={{ fontSize: "0.85rem" }}>Pareto Frontier Options</h2>
            <span className="badge badge-accent">{plans.length} non-dominated</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {plans.map((p, i) => (
              <button
                key={p.id || i}
                className={`btn btn-sm ${i === selectedPlanIndex ? "btn-primary" : "btn-secondary"}`}
                onClick={() => onSelectPlan(i)}
                style={{ fontSize: "0.75rem", padding: "5px 10px" }}
              >
                Plan {i + 1} · ₹{p.total_cost.toFixed(1)} · R:{p.expected_regret.toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Graph Intelligence Panel */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={15} style={{ color: "#2563eb" }} />
            <h2 style={{ fontSize: "0.875rem" }}>Dynamic Visual Intelligence</h2>
          </div>
          {/* Tab Switcher */}
          <div className="graph-tab-bar">
            <button
              className={`graph-tab-btn ${activeGraphTab === "radar" ? "active" : ""}`}
              onClick={() => setActiveGraphTab("radar")}
              title="Multi-Criteria Radar"
            >
              <Sliders size={11} /> Radar
            </button>
            <button
              className={`graph-tab-btn ${activeGraphTab === "hops" ? "active" : ""}`}
              onClick={() => setActiveGraphTab("hops")}
              title="Hop Breakdown"
            >
              <BarChart3 size={11} /> Hops
            </button>
            <button
              className={`graph-tab-btn ${activeGraphTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveGraphTab("profile")}
              title="Transit Profile"
            >
              <TrendingUp size={11} /> Profile
            </button>
          </div>
        </div>

        {/* Tab 1: Multi-Criteria Radar */}
        {activeGraphTab === "radar" && (
          <div className="animate-fade-in">
            <TradeoffRadarChart plan={plan} />
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                textAlign: "center",
                marginTop: 6,
              }}
            >
              Comprehensive 5-axis scoring evaluating resilience, cost, velocity &amp; compliance.
            </div>
          </div>
        )}

        {/* Tab 2: Hop Breakdown */}
        {activeGraphTab === "hops" && (
          <div className="animate-fade-in">
            <HopBreakdownChart routeIds={plan.route_ids} graph={graph} />
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                textAlign: "center",
                marginTop: 6,
              }}
            >
              Per-segment freight costs (₹) and transit duration (hrs) across corridors.
            </div>
          </div>
        )}

        {/* Tab 3: Transit Profile Area Chart */}
        {activeGraphTab === "profile" && (
          <div className="animate-fade-in">
            <TransitProfileChart routeIds={plan.route_ids} graph={graph} />
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                textAlign: "center",
                marginTop: 6,
              }}
            >
              Cumulative route progression curve from origin to destination.
            </div>
          </div>
        )}
      </div>

      {/* Turn-by-Turn Route Breakdown */}
      <div className="card">
        <div className="card-header">
          <h2>
            <Route size={15} style={{ color: "#2563eb" }} />
            Corridor Route Details
          </h2>
          <span style={{ fontSize: "0.725rem" }}>
            {plan.status === "finalized" ? (
              <span style={{ color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                <CheckCircle size={12} /> Feasible &amp; Compliant
              </span>
            ) : (
              <span style={{ color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                <XCircle size={12} /> {plan.status}
              </span>
            )}
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Leg</th>
              <th>Cost</th>
              <th>Time</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {plan.route_ids.map((rid, i) => {
              const route = routeMap[rid];
              if (!route) return null;
              const originName = graph.depots.find((d) => d.id === route.origin_id)?.name || route.origin_id;
              const destName = graph.depots.find((d) => d.id === route.destination_id)?.name || route.destination_id;
              return (
                <tr key={rid} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <td style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.72rem" }}>{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#0f172a" }}>
                      {originName} <span style={{ color: "#94a3b8" }}>→</span> {destName}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                      {rid}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>₹{route.cost}</td>
                  <td style={{ fontSize: "0.8rem" }}>{route.time_hours}h</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: "0.72rem", color: riskColor(route.risk_prior), fontWeight: 700 }}>
                        {(route.risk_prior * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
