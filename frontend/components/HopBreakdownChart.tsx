"use client";
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Route, GraphInput } from "../lib/api";

interface Props {
  routeIds: string[];
  graph: GraphInput;
}

export function HopBreakdownChart({ routeIds, graph }: Props) {
  const data = routeIds.map((rid, idx) => {
    const route = graph.routes.find((r) => r.id === rid);
    const origin = graph.depots.find((d) => d.id === route?.origin_id);
    const dest = graph.depots.find((d) => d.id === route?.destination_id);

    const label = origin && dest ? `${origin.name.slice(0, 3)}→${dest.name.slice(0, 3)}` : `Leg ${idx + 1}`;
    const fullName = origin && dest ? `${origin.name} → ${dest.name}` : rid;

    return {
      name: label,
      fullName,
      cost: route?.cost || 0,
      hours: route?.time_hours || 0,
      risk: Math.round(((route?.risk_prior || 0) * 100)),
    };
  });

  return (
    <div style={{ width: "100%", height: 210 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                      color: "#0f172a",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.fullName}</div>
                    <div style={{ color: "#2563eb" }}>Cost: ₹{item.cost}</div>
                    <div style={{ color: "#0f172a" }}>Duration: {item.hours} hrs</div>
                    <div style={{ color: "#dc2626" }}>Disruption Risk: {item.risk}%</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconSize={8}
            wrapperStyle={{ fontSize: "0.7rem", paddingBottom: 6 }}
          />
          <Bar dataKey="cost" name="Cost (₹)" fill="#2563eb" radius={[3, 3, 0, 0]} />
          <Bar dataKey="hours" name="Time (hrs)" fill="#0f172a" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
