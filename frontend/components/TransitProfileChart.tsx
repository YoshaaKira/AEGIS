"use client";
import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { GraphInput } from "../lib/api";

interface Props {
  routeIds: string[];
  graph: GraphInput;
}

export function TransitProfileChart({ routeIds, graph }: Props) {
  let cumCost = 0;
  let cumHours = 0;

  const data: Array<{
    stop: string;
    cumCost: number;
    cumHours: number;
    legCost: number;
    legHours: number;
  }> = [];

  // Start node
  if (routeIds.length > 0) {
    const firstRoute = graph.routes.find((r) => r.id === routeIds[0]);
    const origin = graph.depots.find((d) => d.id === firstRoute?.origin_id);
    data.push({
      stop: origin?.name ? origin.name.slice(0, 4) : "Start",
      cumCost: 0,
      cumHours: 0,
      legCost: 0,
      legHours: 0,
    });
  }

  for (const rid of routeIds) {
    const route = graph.routes.find((r) => r.id === rid);
    if (!route) continue;
    cumCost += route.cost;
    cumHours += route.time_hours;
    const dest = graph.depots.find((d) => d.id === route.destination_id);
    data.push({
      stop: dest?.name ? dest.name.slice(0, 4) : rid.slice(0, 4),
      cumCost,
      cumHours,
      legCost: route.cost,
      legHours: route.time_hours,
    });
  }

  return (
    <div style={{ width: "100%", height: 210 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cobaltGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="slateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="stop"
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
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Stop: {item.stop}</div>
                    <div style={{ color: "#2563eb" }}>Cumulative Cost: ₹{item.cumCost}</div>
                    <div style={{ color: "#0f172a" }}>Cumulative Time: {item.cumHours} hrs</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="cumCost"
            name="Cumulative Cost"
            stroke="#2563eb"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#cobaltGrad)"
          />
          <Area
            type="monotone"
            dataKey="cumHours"
            name="Cumulative Hours"
            stroke="#0f172a"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            fillOpacity={1}
            fill="url(#slateGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
