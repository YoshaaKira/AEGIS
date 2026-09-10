"use client";
import { useState } from "react";
import { ParetoChart, PlanPoint } from "../components/ParetoChart";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export default function Home() {
  const [plans, setPlans] = useState<PlanPoint[]>([]); const [message, setMessage] = useState("Load a graph and shipments via the SDK or API, then refresh the frontier.");
  async function refresh() { const r = await fetch(`${API}/v1/pareto`, { headers: { "X-API-Key": "local-dev-key" } }); if (!r.ok) { setMessage(`API error: ${r.status}`); return; } const data = await r.json(); setPlans(data); setMessage(`${data.length} non-dominated plan(s) loaded.`); }
  return <main><header><p className="eyebrow">AEGIS / RESILIENCE ENGINE</p><h1>Cost is only the first answer.</h1><p>Stress-test delivery plans against disruption and expose the cost-versus-resilience tradeoff.</p></header><section><div className="card"><h2>Pareto frontier</h2><p>{message}</p><button onClick={refresh}>Refresh frontier</button><ParetoChart plans={plans} /></div><div className="card"><h2>Disruption console</h2><p>Inject disruptions through <code>POST /v1/disrupt</code>; a replan is then requested at <code>POST /v1/plan/&lbrace;id&rbrace;/replan</code>.</p><p className="muted">The production map and live event feed connect to the simulation WebSocket.</p></div></section></main>;
}
