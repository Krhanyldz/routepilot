import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { TransportKnowledgeGraphSnapshot } from "@/domain/transport-knowledge-graph";
import { FileTransportKnowledgeGraphRepository } from "./file-repository";
import { TransportKnowledgeGraph } from "./graph";
import { validateTransportKnowledgeGraph } from "./validate";

const temporaryDirectories: string[] = [];
const snapshot: TransportKnowledgeGraphSnapshot = {
  schemaVersion: 1,
  revision: 1,
  updatedAt: "2026-07-22T00:00:00.000Z",
  locations: [
    { id: "origin", name: "Origin", city: "Origin", countryCode: "ZZ", type: "city", latitude: 0, longitude: 0, aliases: [], timeZone: "Etc/UTC", dataSource: "live", sourceReferences: [{ sourceId: "fixture", sourceRecordId: "origin" }] },
    { id: "destination", name: "Destination", city: "Destination", countryCode: "ZZ", type: "airport", latitude: 1, longitude: 1, code: "DST", aliases: [], timeZone: "Etc/UTC", dataSource: "live", sourceReferences: [{ sourceId: "fixture", sourceRecordId: "destination" }] },
  ],
  edges: [
    { id: "connection", fromLocationId: "origin", toLocationId: "destination", mode: "flight", typicalDurationMinutes: 60, positioning: false, dataSource: "live", sourceReferences: [{ sourceId: "fixture", sourceRecordId: "connection" }] },
  ],
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("transport knowledge graph", () => {
  it("loads normalized entities and provider-independent edges", () => {
    const validated = validateTransportKnowledgeGraph(snapshot);
    const graph = new TransportKnowledgeGraph(validated);

    expect(graph.getLocation("destination")).toMatchObject({ code: "DST", timeZone: "Etc/UTC" });
    expect(graph.getOutgoingEdges("origin").map(({ mode }) => mode)).toEqual(["flight"]);
    expect(validated.edges.every((edge) => !("providerId" in edge) && !("price" in edge))).toBe(true);
  });

  it("persists and reloads a versioned snapshot", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = join(directory, "graph.json");
    const repository = new FileTransportKnowledgeGraphRepository(filePath);
    const validated = validateTransportKnowledgeGraph(snapshot);

    await repository.save({ ...validated, revision: 2, updatedAt: "2026-07-22T12:00:00.000Z" });

    expect(await repository.load()).toMatchObject({ revision: 2, schemaVersion: 1 });
    expect(JSON.parse(await readFile(filePath, "utf8"))).toHaveProperty("locations", validated.locations);
  });

  it("rejects dangling edges and corrupt persisted data", async () => {
    const invalid = structuredClone(snapshot);
    const firstEdge = invalid.edges[0];
    const edges = [{ ...firstEdge, toLocationId: "missing-location" }, ...invalid.edges.slice(1)];
    expect(() => validateTransportKnowledgeGraph({ ...invalid, edges })).toThrow("references an unknown location");

    const directory = await makeTemporaryDirectory();
    const filePath = join(directory, "graph.json");
    await writeFile(filePath, "not-json", "utf8");
    await expect(new FileTransportKnowledgeGraphRepository(filePath).load()).rejects.toThrow();
  });
});

async function makeTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "routepilot-knowledge-graph-"));
  temporaryDirectories.push(directory);
  return directory;
}
