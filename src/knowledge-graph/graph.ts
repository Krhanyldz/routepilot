import type { NormalizedLocation, TransportEdge, TransportKnowledgeGraphSnapshot } from "@/domain/transport-knowledge-graph";
import { validateTransportKnowledgeGraph } from "./validate";

export class TransportKnowledgeGraph {
  private readonly locationsById: ReadonlyMap<string, NormalizedLocation>;
  private readonly outgoingByLocationId: ReadonlyMap<string, readonly TransportEdge[]>;

  constructor(readonly snapshot: TransportKnowledgeGraphSnapshot) {
    const validated = validateTransportKnowledgeGraph(snapshot);
    this.snapshot = validated;
    this.locationsById = new Map(validated.locations.map((location) => [location.id, location]));
    const outgoing = new Map<string, TransportEdge[]>();
    for (const edge of validated.edges) {
      outgoing.set(edge.fromLocationId, [...(outgoing.get(edge.fromLocationId) ?? []), edge]);
    }
    this.outgoingByLocationId = outgoing;
  }

  getLocation(id: string): NormalizedLocation | undefined {
    return this.locationsById.get(id);
  }

  getOutgoingEdges(locationId: string): readonly TransportEdge[] {
    return this.outgoingByLocationId.get(locationId) ?? [];
  }
}
