import type { Location, TransportMode } from "./models";

export const TRANSPORT_KNOWLEDGE_GRAPH_SCHEMA_VERSION = 1 as const;

export interface SourceReference {
  sourceId: string;
  sourceRecordId: string;
}

export interface NormalizedLocation extends Location {
  aliases: readonly string[];
  timeZone: string;
  dataSource: "demo" | "live";
  sourceReferences: readonly SourceReference[];
}

/** A durable connectivity fact, not a fare, schedule, or claim of availability. */
export interface TransportEdge {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  mode: TransportMode;
  typicalDurationMinutes?: number;
  positioning: boolean;
  dataSource: "demo" | "live";
  sourceReferences: readonly SourceReference[];
}

export interface TransportKnowledgeGraphSnapshot {
  schemaVersion: typeof TRANSPORT_KNOWLEDGE_GRAPH_SCHEMA_VERSION;
  revision: number;
  updatedAt: string;
  locations: readonly NormalizedLocation[];
  edges: readonly TransportEdge[];
}

export interface TransportKnowledgeGraphRepository {
  load(): Promise<TransportKnowledgeGraphSnapshot>;
  save(snapshot: TransportKnowledgeGraphSnapshot): Promise<void>;
}
