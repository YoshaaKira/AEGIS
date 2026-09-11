export interface Depot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface Route {
  id: string;
  origin_id: string;
  destination_id: string;
  cost: number;
  time_hours: number;
  risk_prior: number;
  restricted_goods: string[];
}

export interface GraphInput {
  depots: Depot[];
  routes: Route[];
}

export interface Shipment {
  id: string;
  origin_id: string;
  destination_id: string;
  goods_type: string;
  weight_kg: number;
  deadline_hours: number | null;
}

export interface Plan {
  id: string;
  shipment_id: string;
  route_ids: string[];
  total_cost: number;
  expected_regret: number;
  status: string;
}

export interface PlanPoint {
  total_cost: number;
  expected_regret: number;
  label?: string;
}

export interface Disruption {
  id: string;
  type: string;
  edge_id: string;
  severity: number;
  source: string;
}

export interface SimulationEvent {
  type:
    | "connected"
    | "heartbeat"
    | "plan_started"
    | "disruption_injected"
    | "replan_started"
    | "replan_finalized";
  payload: Record<string, unknown>;
}
