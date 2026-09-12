/**
 * Dynamic Graph Engine — Logically aware network injection for arbitrary addresses.
 * Connects any Indian location/city/address into the AEGIS national transit spine
 * via calculated feeder corridors.
 */

import type { Depot, Route, GraphInput } from "./api";
import { haversineDistance } from "./geocoding";
import { INDIA_NETWORK } from "./constants";

export interface CustomLocation {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  displayName?: string;
  isCustom?: boolean;
}

export interface DynamicGraphResult {
  graph: GraphInput;
  sourceId: string;
  destinationId: string;
  isCustomSource: boolean;
  isCustomDest: boolean;
  feederRouteIds: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 20);
}

/**
 * Builds a dynamically expanded GraphInput that seamlessly incorporates
 * custom source and destination addresses into the national transit spine.
 */
export function buildDynamicNetwork(
  sourceLoc: CustomLocation,
  destLoc: CustomLocation,
  baseNetwork: GraphInput = INDIA_NETWORK
): DynamicGraphResult {
  const depots: Depot[] = [...baseNetwork.depots];
  const routes: Route[] = [...baseNetwork.routes];
  const feederRouteIds: string[] = [];

  let sourceId = sourceLoc.id;
  let isCustomSource = false;

  // Check if source is already an existing depot
  const existingSource = depots.find(
    (d) => d.id === sourceLoc.id || (Math.abs(d.latitude - sourceLoc.latitude) < 0.05 && Math.abs(d.longitude - sourceLoc.longitude) < 0.05)
  );

  if (existingSource) {
    sourceId = existingSource.id;
  } else {
    isCustomSource = true;
    sourceId = `depot-${slugify(sourceLoc.name || "source")}-src`;
    const newDepot: Depot = {
      id: sourceId,
      name: sourceLoc.name,
      latitude: sourceLoc.latitude,
      longitude: sourceLoc.longitude,
    };
    depots.push(newDepot);

    // Find 2 closest backbone hubs
    const sortedHubs = [...baseNetwork.depots]
      .map((h) => ({
        hub: h,
        dist: haversineDistance(sourceLoc.latitude, sourceLoc.longitude, h.latitude, h.longitude),
      }))
      .sort((a, b) => a.dist - b.dist);

    const closestHubs = sortedHubs.slice(0, 2);

    for (const { hub, dist } of closestHubs) {
      const cost = Math.max(2, Math.round(dist * 0.015));
      const timeHours = Math.max(1, Math.round(dist / 55));
      const riskPrior = 0.05;

      const rOutId = `r-feed-${sourceId}-${hub.id}`;
      const rInId = `r-feed-${hub.id}-${sourceId}`;

      routes.push({
        id: rOutId,
        origin_id: sourceId,
        destination_id: hub.id,
        cost,
        time_hours: timeHours,
        risk_prior: riskPrior,
        restricted_goods: [],
      });
      routes.push({
        id: rInId,
        origin_id: hub.id,
        destination_id: sourceId,
        cost,
        time_hours: timeHours,
        risk_prior: riskPrior,
        restricted_goods: [],
      });

      feederRouteIds.push(rOutId, rInId);
    }
  }

  let destId = destLoc.id;
  let isCustomDest = false;

  // Check if destination is already an existing depot
  const existingDest = depots.find(
    (d) => d.id === destLoc.id || (Math.abs(d.latitude - destLoc.latitude) < 0.05 && Math.abs(d.longitude - destLoc.longitude) < 0.05)
  );

  if (existingDest) {
    destId = existingDest.id;
  } else {
    isCustomDest = true;
    destId = `depot-${slugify(destLoc.name || "dest")}-dst`;
    const newDepot: Depot = {
      id: destId,
      name: destLoc.name,
      latitude: destLoc.latitude,
      longitude: destLoc.longitude,
    };
    depots.push(newDepot);

    // Find 2 closest backbone hubs
    const sortedHubs = [...baseNetwork.depots]
      .map((h) => ({
        hub: h,
        dist: haversineDistance(destLoc.latitude, destLoc.longitude, h.latitude, h.longitude),
      }))
      .sort((a, b) => a.dist - b.dist);

    const closestHubs = sortedHubs.slice(0, 2);

    for (const { hub, dist } of closestHubs) {
      const cost = Math.max(2, Math.round(dist * 0.015));
      const timeHours = Math.max(1, Math.round(dist / 55));
      const riskPrior = 0.05;

      const rOutId = `r-feed-${hub.id}-${destId}`;
      const rInId = `r-feed-${destId}-${hub.id}`;

      routes.push({
        id: rOutId,
        origin_id: hub.id,
        destination_id: destId,
        cost,
        time_hours: timeHours,
        risk_prior: riskPrior,
        restricted_goods: [],
      });
      routes.push({
        id: rInId,
        origin_id: destId,
        destination_id: hub.id,
        cost,
        time_hours: timeHours,
        risk_prior: riskPrior,
        restricted_goods: [],
      });

      feederRouteIds.push(rOutId, rInId);
    }
  }

  // If both are custom and within direct driving distance (< 350 km), add a direct link
  if (isCustomSource && isCustomDest && sourceId && destId) {
    const directDist = haversineDistance(
      sourceLoc.latitude,
      sourceLoc.longitude,
      destLoc.latitude,
      destLoc.longitude
    );
    if (directDist < 350) {
      const cost = Math.max(2, Math.round(directDist * 0.015));
      const timeHours = Math.max(1, Math.round(directDist / 55));
      const rDirect1 = `r-direct-${sourceId}-${destId}`;
      const rDirect2 = `r-direct-${destId}-${sourceId}`;
      routes.push({
        id: rDirect1,
        origin_id: sourceId,
        destination_id: destId,
        cost,
        time_hours: timeHours,
        risk_prior: 0.06,
        restricted_goods: [],
      });
      routes.push({
        id: rDirect2,
        origin_id: destId,
        destination_id: sourceId,
        cost,
        time_hours: timeHours,
        risk_prior: 0.06,
        restricted_goods: [],
      });
      feederRouteIds.push(rDirect1, rDirect2);
    }
  }

  return {
    graph: { depots, routes },
    sourceId: sourceId || "delhi",
    destinationId: destId || "chennai",
    isCustomSource,
    isCustomDest,
    feederRouteIds,
  };
}
