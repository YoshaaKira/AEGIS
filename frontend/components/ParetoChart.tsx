"use client";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
} from "recharts";
import type { PlanPoint } from "../lib/api";

interface Props {
  plans: PlanPoint[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
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
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
        {data.label || "Plan"}
      </div>
      <div style={{ color: "#2563eb", fontWeight: 600 }}>Cost: ₹{data.total_cost?.toFixed(2)}</div>
      <div style={{ color: "#dc2626", fontWeight: 600 }}>Regret: {data.expected_regret?.toFixed(4)}</div>
    </div>
  );
};

export function ParetoChart({ plans, selectedIndex, onSelect }: Props) {
  if (plans.length === 0) {
    return (
      <div
        style={{
          height: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "0.85rem",
        }}
      >
        No plans to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 20, right: 24, bottom: 20, left: 10 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(148, 163, 184, 0.08)"
        />
        <XAxis
          dataKey="total_cost"
          name="Cost"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={{ stroke: "rgba(148, 163, 184, 0.1)" }}
          tickLine={false}
          label={{
            value: "Total Cost (₹)",
            position: "insideBottom",
            offset: -10,
            fill: "#64748b",
            fontSize: 11,
          }}
        />
        <YAxis
          dataKey="expected_regret"
          name="Expected Regret"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={{ stroke: "rgba(148, 163, 184, 0.1)" }}
          tickLine={false}
          label={{
            value: "Expected Regret",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            fill: "#64748b",
            fontSize: 11,
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(37, 99, 235, 0.3)", strokeDasharray: "4 4" }} />

        {/* Pareto front connecting line */}
        <Scatter
          name="AEGIS Pareto Frontier"
          data={plans}
          line={{ stroke: "rgba(37, 99, 235, 0.4)", strokeWidth: 1.5 }}
          lineType="joint"
          onClick={(_: any, index: number) => onSelect?.(index)}
          style={{ cursor: onSelect ? "pointer" : "default" }}
        >
          {plans.map((_, index) => (
            <Cell
              key={index}
              fill={index === selectedIndex ? "#2563eb" : "#94a3b8"}
              stroke={index === selectedIndex ? "#ffffff" : "#64748b"}
              strokeWidth={index === selectedIndex ? 2.5 : 1}
              r={index === selectedIndex ? 8 : 5}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
