"use client";
import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  Package,
  Gauge,
  ArrowUpDown,
  Search,
  X,
  Compass,
  Sparkles,
  Building2,
} from "lucide-react";
import type { Depot } from "../lib/api";
import { searchAddress, type GeocodedLocation } from "../lib/geocoding";
import type { CustomLocation } from "../lib/dynamicGraph";

interface Props {
  depots: Depot[];
  sourceLoc: CustomLocation | null;
  destLoc: CustomLocation | null;
  goodsType: string;
  riskWeight: number;
  onSourceSelect: (loc: CustomLocation) => void;
  onDestSelect: (loc: CustomLocation) => void;
  onSwap: () => void;
  onGoodsChange: (type: string) => void;
  onRiskWeightChange: (w: number) => void;
  onPresetSelect: (src: CustomLocation, dst: CustomLocation) => void;
}

export function SourceDestPicker({
  depots,
  sourceLoc,
  destLoc,
  goodsType,
  riskWeight,
  onSourceSelect,
  onDestSelect,
  onSwap,
  onGoodsChange,
  onRiskWeightChange,
  onPresetSelect,
}: Props) {
  // Source search state
  const [srcQuery, setSrcQuery] = useState(sourceLoc?.name || "");
  const [srcResults, setSrcResults] = useState<GeocodedLocation[]>([]);
  const [srcSearching, setSrcSearching] = useState(false);
  const [showSrcDropdown, setShowSrcDropdown] = useState(false);
  const srcTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const srcDropdownRef = useRef<HTMLDivElement>(null);

  // Dest search state
  const [destQuery, setDestQuery] = useState(destLoc?.name || "");
  const [destResults, setDestResults] = useState<GeocodedLocation[]>([]);
  const [destSearching, setDestSearching] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const destTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const destDropdownRef = useRef<HTMLDivElement>(null);

  // Sync queries with prop changes
  useEffect(() => {
    if (sourceLoc) setSrcQuery(sourceLoc.name);
    else setSrcQuery("");
  }, [sourceLoc]);

  useEffect(() => {
    if (destLoc) setDestQuery(destLoc.name);
    else setDestQuery("");
  }, [destLoc]);

  // Handle source search change
  const handleSrcInputChange = (val: string) => {
    setSrcQuery(val);
    if (srcTimeoutRef.current) clearTimeout(srcTimeoutRef.current);

    if (val.trim().length < 2) {
      setSrcResults([]);
      setShowSrcDropdown(false);
      return;
    }

    setSrcSearching(true);
    srcTimeoutRef.current = setTimeout(async () => {
      const res = await searchAddress(val, depots);
      setSrcResults(res);
      setShowSrcDropdown(res.length > 0);
      setSrcSearching(false);
    }, 280);
  };

  // Handle dest search change
  const handleDestInputChange = (val: string) => {
    setDestQuery(val);
    if (destTimeoutRef.current) clearTimeout(destTimeoutRef.current);

    if (val.trim().length < 2) {
      setDestResults([]);
      setShowDestDropdown(false);
      return;
    }

    setDestSearching(true);
    destTimeoutRef.current = setTimeout(async () => {
      const res = await searchAddress(val, depots);
      setDestResults(res);
      setShowDestDropdown(res.length > 0);
      setDestSearching(false);
    }, 280);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        srcDropdownRef.current &&
        !srcDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSrcDropdown(false);
      }
      if (
        destDropdownRef.current &&
        !destDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDestDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSourceGeocoded = (loc: GeocodedLocation) => {
    onSourceSelect({
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      displayName: loc.displayName,
      isCustom: true,
    });
    setSrcQuery(loc.name);
    setShowSrcDropdown(false);
  };

  const selectSourceDepot = (depotId: string) => {
    const d = depots.find((x) => x.id === depotId);
    if (d) {
      onSourceSelect({
        id: d.id,
        name: d.name,
        latitude: d.latitude,
        longitude: d.longitude,
        isCustom: false,
      });
      setSrcQuery(d.name);
      setShowSrcDropdown(false);
    }
  };

  const selectDestGeocoded = (loc: GeocodedLocation) => {
    onDestSelect({
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      displayName: loc.displayName,
      isCustom: true,
    });
    setDestQuery(loc.name);
    setShowDestDropdown(false);
  };

  const selectDestDepot = (depotId: string) => {
    const d = depots.find((x) => x.id === depotId);
    if (d) {
      onDestSelect({
        id: d.id,
        name: d.name,
        latitude: d.latitude,
        longitude: d.longitude,
        isCustom: false,
      });
      setDestQuery(d.name);
      setShowDestDropdown(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <Navigation size={15} style={{ color: "#2563eb" }} />
          Route Configuration
        </h2>
        <span
          style={{
            fontSize: "0.68rem",
            color: "#2563eb",
            background: "rgba(37, 99, 235, 0.08)",
            padding: "2px 8px",
            borderRadius: 9999,
            fontWeight: 600,
          }}
        >
          OSM Dynamic Graph
        </span>
      </div>

      {/* Quick Presets Bar */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Sparkles size={11} style={{ color: "#2563eb" }} />
          Quick Test Corridors
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            className="search-action-btn"
            onClick={() => {
              const d1 = depots.find((d) => d.id === "delhi")!;
              const d2 = depots.find((d) => d.id === "chennai")!;
              onPresetSelect(d1, d2);
            }}
          >
            Delhi → Chennai
          </button>
          <button
            className="search-action-btn"
            onClick={() => {
              onPresetSelect(
                { name: "Gurugram, Haryana", latitude: 28.4595, longitude: 77.0266, isCustom: true },
                { name: "Kochi, Kerala", latitude: 9.9312, longitude: 76.2673, isCustom: true }
              );
            }}
          >
            Gurugram → Kochi (Custom)
          </button>
          <button
            className="search-action-btn"
            onClick={() => {
              const d1 = depots.find((d) => d.id === "mumbai")!;
              const d2 = depots.find((d) => d.id === "kolkata")!;
              onPresetSelect(d1, d2);
            }}
          >
            Mumbai → Kolkata
          </button>
          <button
            className="search-action-btn"
            onClick={() => {
              onPresetSelect(
                { name: "Noida, UP", latitude: 28.5355, longitude: 77.3910, isCustom: true },
                depots.find((d) => d.id === "bangalore")!
              );
            }}
          >
            Noida → Bangalore
          </button>
        </div>
      </div>

      {/* Source Address Search Input */}
      <div className="form-group" style={{ position: "relative" }} ref={srcDropdownRef}>
        <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            <MapPin size={11} style={{ color: "#2563eb" }} /> Origin / Source Address
          </span>
          {sourceLoc?.isCustom && (
            <span className="badge badge-accent" style={{ fontSize: "0.62rem" }}>
              Custom Node
            </span>
          )}
        </label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Type any address, city, or pin code (e.g. Gurugram)..."
            value={srcQuery}
            onChange={(e) => handleSrcInputChange(e.target.value)}
            onFocus={() => {
              if (srcResults.length > 0) setShowSrcDropdown(true);
            }}
            style={{ paddingRight: srcQuery ? 50 : 28 }}
          />
          {srcSearching && (
            <span
              className="spinner"
              style={{
                position: "absolute",
                right: srcQuery ? 28 : 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 12,
                height: 12,
              }}
            />
          )}
          {srcQuery && (
            <button
              onClick={() => {
                setSrcQuery("");
                setSrcResults([]);
                setShowSrcDropdown(false);
              }}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Source Dropdown Suggestions */}
        {showSrcDropdown && (
          <div className="search-dropdown-menu">
            <div style={{ padding: "4px 8px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b" }}>
              NATIONAL BACKBONE HUBS
            </div>
            {depots.slice(0, 4).map((d) => (
              <div
                key={d.id}
                className="search-result-item"
                onClick={() => selectSourceDepot(d.id)}
              >
                <div className="search-result-title">
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Building2 size={11} style={{ color: "#2563eb" }} /> {d.name}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "#64748b" }}>Core Hub</span>
                </div>
              </div>
            ))}

            {srcResults.length > 0 && (
              <>
                <div style={{ padding: "6px 8px 4px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", borderTop: "1px solid #f1f5f9" }}>
                  OPENSTREETMAP RESULTS
                </div>
                {srcResults.map((loc) => (
                  <div
                    key={loc.placeId}
                    className="search-result-item"
                    onClick={() => selectSourceGeocoded(loc)}
                  >
                    <div className="search-result-title">
                      <span>{loc.name}</span>
                      {loc.nearestDepot && (
                        <span className="badge badge-accent" style={{ fontSize: "0.62rem" }}>
                          Nearest: {loc.nearestDepot.depot.name} ({loc.nearestDepot.distanceKm} km)
                        </span>
                      )}
                    </div>
                    <div className="search-result-subtitle">{loc.displayName}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Fast Swap Button */}
      <div style={{ display: "flex", justifyContent: "center", margin: "-6px 0 4px" }}>
        <button
          onClick={onSwap}
          className="search-action-btn"
          style={{ borderRadius: 9999, padding: "4px 12px", gap: 6 }}
          title="Swap Source and Destination"
        >
          <ArrowUpDown size={12} style={{ color: "#2563eb" }} /> Swap Origin &amp; Destination
        </button>
      </div>

      {/* Destination Address Search Input */}
      <div className="form-group" style={{ position: "relative" }} ref={destDropdownRef}>
        <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            <MapPin size={11} style={{ color: "#dc2626" }} /> Destination Address
          </span>
          {destLoc?.isCustom && (
            <span className="badge badge-danger" style={{ fontSize: "0.62rem" }}>
              Custom Node
            </span>
          )}
        </label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Type any address, city, or pin code (e.g. Kochi)..."
            value={destQuery}
            onChange={(e) => handleDestInputChange(e.target.value)}
            onFocus={() => {
              if (destResults.length > 0) setShowDestDropdown(true);
            }}
            style={{ paddingRight: destQuery ? 50 : 28 }}
          />
          {destSearching && (
            <span
              className="spinner"
              style={{
                position: "absolute",
                right: destQuery ? 28 : 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 12,
                height: 12,
              }}
            />
          )}
          {destQuery && (
            <button
              onClick={() => {
                setDestQuery("");
                setDestResults([]);
                setShowDestDropdown(false);
              }}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Destination Dropdown Suggestions */}
        {showDestDropdown && (
          <div className="search-dropdown-menu">
            <div style={{ padding: "4px 8px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b" }}>
              NATIONAL BACKBONE HUBS
            </div>
            {depots.slice(0, 4).map((d) => (
              <div
                key={d.id}
                className="search-result-item"
                onClick={() => selectDestDepot(d.id)}
              >
                <div className="search-result-title">
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Building2 size={11} style={{ color: "#dc2626" }} /> {d.name}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "#64748b" }}>Core Hub</span>
                </div>
              </div>
            ))}

            {destResults.length > 0 && (
              <>
                <div style={{ padding: "6px 8px 4px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", borderTop: "1px solid #f1f5f9" }}>
                  OPENSTREETMAP RESULTS
                </div>
                {destResults.map((loc) => (
                  <div
                    key={loc.placeId}
                    className="search-result-item"
                    onClick={() => selectDestGeocoded(loc)}
                  >
                    <div className="search-result-title">
                      <span>{loc.name}</span>
                      {loc.nearestDepot && (
                        <span className="badge badge-accent" style={{ fontSize: "0.62rem" }}>
                          Nearest: {loc.nearestDepot.depot.name} ({loc.nearestDepot.distanceKm} km)
                        </span>
                      )}
                    </div>
                    <div className="search-result-subtitle">{loc.displayName}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Goods Type Selection */}
      <div className="form-group">
        <label className="form-label">
          <Package size={11} /> Goods Classification
        </label>
        <select
          className="form-select"
          value={goodsType}
          onChange={(e) => onGoodsChange(e.target.value)}
        >
          <option value="general">General Commercial Cargo</option>
          <option value="perishable">Cold-Chain / Perishable Foods</option>
          <option value="hazardous">Hazardous / Chemical Materials</option>
          <option value="fragile">High-Value / Fragile Electronics</option>
        </select>
      </div>

      {/* Risk Weight Slider */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">
          <Gauge size={11} /> Resilience Risk Weight: {riskWeight.toFixed(1)}
        </label>
        <input
          type="range"
          className="form-range"
          min={0}
          max={5}
          step={0.5}
          value={riskWeight}
          onChange={(e) => onRiskWeightChange(parseFloat(e.target.value))}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.68rem",
            color: "var(--text-secondary)",
            marginTop: 4,
          }}
        >
          <span>Cost-optimal (0.0)</span>
          <span>Risk-averse (5.0)</span>
        </div>
      </div>
    </div>
  );
}
