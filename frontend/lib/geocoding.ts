/**
 * Geocoding & Address Autocomplete Service using OpenStreetMap Nominatim.
 * Free, open-source geocoding across India with automatic nearest-depot mapping.
 */

import type { Depot } from "./api";

export interface GeocodedLocation {
  placeId: string;
  displayName: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  city?: string;
  state?: string;
  postcode?: string;
  nearestDepot?: {
    depot: Depot;
    distanceKm: number;
  };
}

/**
 * Great-circle distance between two coordinates in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Finds the nearest AEGIS logistics depot to a given coordinate.
 */
export function findNearestDepot(
  lat: number,
  lon: number,
  depots: Depot[]
): { depot: Depot; distanceKm: number } | null {
  if (!depots || depots.length === 0) return null;

  let closest: Depot = depots[0];
  let minDistance = haversineDistance(lat, lon, closest.latitude, closest.longitude);

  for (let i = 1; i < depots.length; i++) {
    const dist = haversineDistance(lat, lon, depots[i].latitude, depots[i].longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closest = depots[i];
    }
  }

  return { depot: closest, distanceKm: minDistance };
}

/**
 * Searches Nominatim for Indian cities, addresses, landmarks, or pin codes.
 */
export async function searchAddress(
  query: string,
  depots: Depot[] = []
): Promise<GeocodedLocation[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    clean
  )}&countrycodes=in&addressdetails=1&limit=5`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn("Nominatim geocoding error:", res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      const addr = item.address || {};
      const cityName =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.state_district ||
        item.name ||
        clean;

      const nearest = depots.length > 0 ? findNearestDepot(lat, lon, depots) : null;

      return {
        placeId: String(item.place_id),
        displayName: item.display_name,
        name: cityName,
        latitude: lat,
        longitude: lon,
        type: item.type || "place",
        city: cityName,
        state: addr.state,
        postcode: addr.postcode,
        nearestDepot: nearest || undefined,
      };
    });
  } catch (err) {
    console.error("Failed to query Nominatim:", err);
    return [];
  }
}
