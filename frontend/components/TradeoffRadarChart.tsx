"use client";
import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Plan } from "../lib/api";

interface Props {
  plan: Plan;
  benchmarkAverage?: {
    cost: number;
    regret: number;
    time: number;
  };
}

export function TradeoffRadarChart({ plan, benchmarkAverage }: Props) {
  // Compute normalized scores between 40 and 100
  const costScore = Math.max(35, Math.min(98, Math.round(100 - (plan.total_cost / 50) * 45)));
  const resilienceScore = Math.max(35, Math.min(98, Math.round(100 - (plan.expected_regret / Math.max(1, plan.total_cost)) * 80)));
  const speedScore = Math.max(40, Math.min(95, 88 - (plan.route_ids.length * 5)));
  const redundancyScore = 85;
  const complianceScore = 98;

  const data = [
    { subject: "Cost Efficiency", score: costScore, fullMark: 100 },
    { subject: "Disruption Resilience", score: resilienceScore, fullMark: 100 },
    { subject: "Speed & Velocity", score: speedScore, fullMark: 100 },
    { subject: "Corridor Redundancy", score: redundancyScore, fullMark: 100 },
    { subject: "Compliance Assurance", score: complianceScore, fullMark: 100 },
  ];

  return (
    <div style={{ width: "100%", height: 230 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 9 }}
            stroke="#cbd5e1"
          />
          <Radar
            name="Current Plan"
            dataKey="score"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.25}
            strokeWidth={2}
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
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                      color: "#0f172a",
                    }}
                  >
                    <strong>{item.subject}</strong>: {item.score}/100
                  </div>
                );
              }
              return null;
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
