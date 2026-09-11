"use client";
import { useState } from "react";
import { ParetoChart, PlanPoint } from "../components/ParetoChart";
import { RouteMap } from "../components/RouteMap";
import { EventConsole } from "../components/EventConsole";
import { GraphInput, Plan } from "../types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [graph, setGraph] = useState<GraphInput | null>(null);
  const [message, setMessage] = useState(
    "Load a graph and shipments via the SDK or API, then refresh the frontier.",
  );

  async function refresh() {
    const r = await fetch(`${API}/v1/pareto`, {
      headers: { "X-API-Key": "local-dev-key" },
    });
    if (!r.ok) {
      setMessage(`API error: ${r.status}`);
      return;
    }
    const data = await r.json();
    setPlans(data);
    setMessage(`${data.length} non-dominated plan(s) loaded.`);
  }

  async function loadSample() {
    const resp = await fetch("/sample-graph.json");
    if (!resp.ok) {
      setMessage("Could not fetch sample fixture");
      return;
    }
    const g = await resp.json();
    setGraph(g);
    localStorage.setItem("aegis-graph", JSON.stringify(g));

    const hdr = { "X-API-Key": "local-dev-key", "Content-Type": "application/json" };
    await fetch(`${API}/v1/graph`, { method: "POST", headers: hdr, body: JSON.stringify(g) });

    // Load a sample shipment spanning the graph
    const shipments = [
      {
        id: "s-main",
        origin_id: "depot-a",
        destination_id: "depot-e",
        goods_type: "general",
        weight_kg: 1,
      },
    ];
    await fetch(`${API}/v1/shipments`, {
      method: "POST",
      headers: hdr,
      body: JSON.stringify(shipments),
    });

    // Generate the plan to populate /v1/pareto store
    await fetch(`${API}/v1/plan`, {
      method: "POST",
      headers: hdr,
      body: JSON.stringify({ shipment_id: "s-main" }),
    });

    await refresh();
    setMessage("Sample graph and shipment loaded; frontier refreshed.");
  }

  const chartData: PlanPoint[] = plans.map((p) => ({
    total_cost: p.total_cost,
    expected_regret: p.expected_regret,
    label: p.id,
  }));

  return (
    <main>
      <header>
        <p className="eyebrow">AEGIS / RESILIENCE ENGINE</p>
        <h1>Cost is only the first answer.</h1>
        <p>
          Stress-test delivery plans against disruption and expose the
          cost-versus-resilience tradeoff.
        </p>
      </header>
      <section>
        <div className="card">
          <h2>Pareto frontier</h2>
          <p>{message}</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={loadSample}>Load sample graph</button>
            <button onClick={refresh}>Refresh frontier</button>
          </div>
          <ParetoChart plans={chartData} />
        </div>
        <div className="card">
          <h2>Route map</h2>
          <RouteMap plans={plans} graph={graph} />
        </div>
      </section>
      <section style={{ marginTop: 24 }}>
        <div className="card">
          <h2>Disruption console</h2>
          <EventConsole />
        </div>
      </section>
    </main>
  );
}
