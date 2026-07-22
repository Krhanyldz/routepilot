import { TRANSPORT_MODES } from "@/domain/models";
import {
  TRANSPORT_KNOWLEDGE_GRAPH_SCHEMA_VERSION,
  type NormalizedLocation,
  type SourceReference,
  type TransportEdge,
  type TransportKnowledgeGraphSnapshot,
} from "@/domain/transport-knowledge-graph";

const locationTypes = new Set(["city", "airport", "station", "port"]);
const transportModes = new Set<string>(TRANSPORT_MODES);

export function validateTransportKnowledgeGraph(value: unknown): TransportKnowledgeGraphSnapshot {
  if (!isRecord(value)) throw new Error("Knowledge graph snapshot must be an object");
  if (value.schemaVersion !== TRANSPORT_KNOWLEDGE_GRAPH_SCHEMA_VERSION) {
    throw new Error(`Unsupported knowledge graph schema version: ${String(value.schemaVersion)}`);
  }
  if (!Number.isSafeInteger(value.revision) || Number(value.revision) < 1) {
    throw new Error("Knowledge graph revision must be a positive integer");
  }
  if (!isIsoDate(value.updatedAt)) throw new Error("Knowledge graph updatedAt must be an ISO timestamp");
  if (!Array.isArray(value.locations) || !Array.isArray(value.edges)) {
    throw new Error("Knowledge graph must contain location and edge arrays");
  }

  const locations = value.locations.map(validateLocation);
  assertUnique(locations.map(({ id }) => id), "location");
  const locationIds = new Set(locations.map(({ id }) => id));
  const edges = value.edges.map((edge) => validateEdge(edge, locationIds));
  assertUnique(edges.map(({ id }) => id), "edge");

  return {
    schemaVersion: TRANSPORT_KNOWLEDGE_GRAPH_SCHEMA_VERSION,
    revision: Number(value.revision),
    updatedAt: value.updatedAt as string,
    locations,
    edges,
  };
}

function validateLocation(value: unknown): NormalizedLocation {
  if (!isRecord(value)) throw new Error("Every location must be an object");
  const requiredStrings = ["id", "name", "city", "countryCode", "type", "timeZone", "dataSource"] as const;
  for (const field of requiredStrings) assertNonEmptyString(value[field], `Location ${field}`);
  if (!locationTypes.has(value.type as string)) throw new Error(`Unsupported location type: ${String(value.type)}`);
  if (!/^[A-Z]{2}$/.test(value.countryCode as string)) throw new Error(`Invalid country code: ${String(value.countryCode)}`);
  if (value.dataSource !== "demo" && value.dataSource !== "live") throw new Error("Invalid location data source");
  assertCoordinate(value.latitude, -90, 90, "latitude");
  assertCoordinate(value.longitude, -180, 180, "longitude");
  if (!Array.isArray(value.aliases) || !value.aliases.every((alias) => typeof alias === "string")) {
    throw new Error(`Location ${String(value.id)} has invalid aliases`);
  }
  const sourceReferences = validateSourceReferences(value.sourceReferences, `Location ${String(value.id)}`);

  return {
    id: value.id as string,
    name: value.name as string,
    city: value.city as string,
    countryCode: value.countryCode as string,
    type: value.type as NormalizedLocation["type"],
    latitude: value.latitude as number,
    longitude: value.longitude as number,
    ...(typeof value.code === "string" ? { code: value.code } : {}),
    aliases: value.aliases as string[],
    timeZone: value.timeZone as string,
    dataSource: value.dataSource,
    sourceReferences,
  };
}

function validateEdge(value: unknown, locationIds: ReadonlySet<string>): TransportEdge {
  if (!isRecord(value)) throw new Error("Every edge must be an object");
  for (const field of ["id", "fromLocationId", "toLocationId", "mode", "dataSource"] as const) {
    assertNonEmptyString(value[field], `Edge ${field}`);
  }
  if (!transportModes.has(value.mode as string)) throw new Error(`Unsupported transport mode: ${String(value.mode)}`);
  if (value.dataSource !== "demo" && value.dataSource !== "live") throw new Error("Invalid edge data source");
  if (!locationIds.has(value.fromLocationId as string) || !locationIds.has(value.toLocationId as string)) {
    throw new Error(`Edge ${String(value.id)} references an unknown location`);
  }
  if (value.fromLocationId === value.toLocationId) throw new Error(`Edge ${String(value.id)} cannot be a self-loop`);
  if (typeof value.positioning !== "boolean") throw new Error(`Edge ${String(value.id)} must define positioning`);
  if (value.typicalDurationMinutes !== undefined &&
    (!Number.isSafeInteger(value.typicalDurationMinutes) || Number(value.typicalDurationMinutes) <= 0)) {
    throw new Error(`Edge ${String(value.id)} has invalid typical duration`);
  }

  return {
    id: value.id as string,
    fromLocationId: value.fromLocationId as string,
    toLocationId: value.toLocationId as string,
    mode: value.mode as TransportEdge["mode"],
    ...(value.typicalDurationMinutes === undefined ? {} : { typicalDurationMinutes: Number(value.typicalDurationMinutes) }),
    positioning: value.positioning,
    dataSource: value.dataSource,
    sourceReferences: validateSourceReferences(value.sourceReferences, `Edge ${String(value.id)}`),
  };
}

function validateSourceReferences(value: unknown, owner: string): SourceReference[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${owner} must have source references`);
  return value.map((reference) => {
    if (!isRecord(reference)) throw new Error(`${owner} has an invalid source reference`);
    assertNonEmptyString(reference.sourceId, `${owner} sourceId`);
    assertNonEmptyString(reference.sourceRecordId, `${owner} sourceRecordId`);
    return { sourceId: reference.sourceId as string, sourceRecordId: reference.sourceRecordId as string };
  });
}

function assertUnique(values: readonly string[], kind: string): void {
  if (new Set(values).size !== values.length) throw new Error(`Knowledge graph contains duplicate ${kind} IDs`);
}

function assertNonEmptyString(value: unknown, label: string): void {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
}

function assertCoordinate(value: unknown, minimum: number, maximum: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid location ${label}`);
  }
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
