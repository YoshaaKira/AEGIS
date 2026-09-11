"use client";
import { GraphInput, Plan } from "../types";

export function RouteMap({ plans, graph }: { plans: Plan[]; graph: GraphInput | null }) {
  if (!graph) return <p className="muted">Load a graph to view the route map.</p>;

  const width = 400;
  const height = 300;
  const padding = 40;

  // Project depot lat/lon into pixel coordinates
  const lats = graph.depots.map((d) => d.latitude);
  const lons = graph.depots.map((d) => d.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latRange = Math.max(maxLat - minLat, 0.001);
  const lonRange = Math.max(maxLon - minLon, 0.001);

  const depotPos: Record<string, { x: number; y: number }> = {};
  for (const depot of graph.depots) {
    const x =
      padding + ((depot.longitude - minLon) / lonRange) * (width - 2 * padding);
    const y =
      height -
      padding -
      ((depot.latitude - minLat) / latRange) * (height - 2 * padding);
    depotPos[depot.id] = { x, y };
  }

  // Collect the set of route IDs used by all plans
  const plannedRoutes = new Set<string>();
  for (const plan of plans) {
    for (const rid of plan.route_ids) {
      plannedRoutes.add(rid);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "100%", borderRadius: 12 }}
      className="route-map"
    >
      {/* Background */}
      <rect width={width} height={height} fill="#0c1412" rx={12} />

      {/* Routes */}
      {graph.routes.map((route) => {
        const origin = depotPos[route.origin_id];
        const dest = depotPos[route.destination_id];
        if (!origin || !dest) return null;
        const planned = plannedRoutes.has(route.id);
        return (
          <line
            key={route.id}
            x1={origin.x}
            y1={origin.y}
            x2={dest.x}
            y2={dest.y}
            stroke={planned ? "#59d9a9" : "#2a4b3d"}
            strokeWidth={planned ? 3 : 1}
            opacity={planned ? 0.9 : 0.4}
          />
        );
      })}

      {/* Depots */}
      {graph.depots.map((depot) => {
        const pos = depotPos[depot.id];
        if (!pos) return null;
        return (
          <g key={depot.id}>
            <circle cx={pos.x} cy={pos.y} r={6} fill="#0c1412" stroke="#59d9a9" strokeWidth={2} />
            <text
              x={pos.x + 10}
              y={pos.y + 4}
              fontSize={11}
              fill="#9eafa8"
              pointerEvents="none"
            >
              {depot.name}
            </text>
          </g>
        );
      })}

      {/* Route labels for disrupted edges */}
      {graph.routes
        .filter((r) => plannedRoutes.has(r.id) && r.risk_prior > 0)
        .map((route) => {
          const origin = depotPos[route.origin_id];
          const dest = depotPos[route.destination_id];
          if (!origin || !dest) return null;
          const midX = (origin.x + dest.x) / 2;
          const midY = (origin.y + dest.y) / 2;
          return (
            <text
              key={route.id}
              x={midX}
              y={midY - 6}
              fontSize={10}
              fill="#ffb74d"
              textAnchor="middle"
            >
              ⚠ {route.id}
            </text>
          );
        })}
    </svg>
  );
}
