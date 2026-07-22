import type { TransportMode } from "./models";

export const CANONICAL_LOCATION_TYPES = ["city", "airport", "railway-station", "ferry-terminal"] as const;
export type CanonicalLocationType = (typeof CANONICAL_LOCATION_TYPES)[number];

export interface LocationSourceMetadata {
  sourceId: string;
  sourceRecordId: string;
  sourceType: "demo" | "official" | "aggregator";
  retrievedAt: string;
}

export interface CanonicalLocation {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  type: CanonicalLocationType;
  iataCode?: string;
  stationCode?: string;
  portCode?: string;
  aliases: readonly string[];
  sources: readonly LocationSourceMetadata[];
  lastUpdatedAt: string;
}

export type DepartureLocationType = Exclude<CanonicalLocationType, "city">;

export const LOCATION_TYPE_TRANSPORT_MODE: Readonly<Record<DepartureLocationType, TransportMode>> = {
  airport: "flight",
  "railway-station": "train",
  "ferry-terminal": "ferry",
};

export function createCanonicalLocation(location: CanonicalLocation): CanonicalLocation {
  if (!/^loc:[a-z-]+:[a-z0-9-]+:[a-z0-9-]+$/.test(location.id)) throw new Error(`Invalid canonical location ID: ${location.id}`);
  if (!location.name.trim() || !location.city.trim()) throw new Error("Location name and city are required");
  if (!/^[A-Z]{2}$/.test(location.countryCode)) throw new Error(`Invalid country code: ${location.countryCode}`);
  assertCoordinate(location.latitude, -90, 90, "latitude");
  assertCoordinate(location.longitude, -180, 180, "longitude");
  if (!location.timeZone.includes("/")) throw new Error(`Invalid timezone: ${location.timeZone}`);
  if (!isIsoTimestamp(location.lastUpdatedAt)) throw new Error("Location lastUpdatedAt must be an ISO timestamp");
  if (location.sources.length === 0) throw new Error("Location source metadata is required");
  for (const source of location.sources) {
    if (!source.sourceId.trim() || !source.sourceRecordId.trim() || !isIsoTimestamp(source.retrievedAt)) {
      throw new Error("Invalid location source metadata");
    }
  }
  assertCode(location.iataCode, "IATA");
  assertCode(location.stationCode, "station");
  assertCode(location.portCode, "port");
  return location;
}

export function buildCanonicalLocationId(input: {
  type: CanonicalLocationType;
  countryCode: string;
  primaryCodeOrSlug: string;
}): string {
  const countryCode = input.countryCode.trim().toLowerCase();
  const identity = slugify(input.primaryCodeOrSlug);
  if (!/^[a-z]{2}$/.test(countryCode) || !identity) throw new Error("Cannot build canonical location ID");
  return `loc:${input.type}:${countryCode}:${identity}`;
}

function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function assertCoordinate(value: number, minimum: number, maximum: number, name: string): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`Invalid ${name}: ${value}`);
}

function assertCode(value: string | undefined, label: string): void {
  if (value !== undefined && !/^[A-Z0-9-]{2,12}$/.test(value)) throw new Error(`Invalid ${label} code: ${value}`);
}

function isIsoTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}
