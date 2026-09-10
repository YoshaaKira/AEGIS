"use client";
import { CartesianGrid, Legend, ReferenceDot, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

export type PlanPoint = { total_cost: number; expected_regret: number; label?: string };
export function ParetoChart({ plans }: { plans: PlanPoint[] }) {
  return <ResponsiveContainer width="100%" height={300}><ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}><CartesianGrid /><XAxis dataKey="total_cost" name="Cost" /><YAxis dataKey="expected_regret" name="Expected regret" /><Tooltip cursor={{ strokeDasharray: "3 3" }} /><Legend /><Scatter name="AEGIS candidates" data={plans} fill="#59d9a3" />{plans[0] && <ReferenceDot x={plans[0].total_cost} y={plans[0].expected_regret} r={6} fill="#ffb74d" label="baseline" />}</ScatterChart></ResponsiveContainer>;
}
