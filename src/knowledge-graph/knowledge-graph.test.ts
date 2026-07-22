import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import demoSnapshot from "@/providers/demo/transport-knowledge-graph.json";
import type { TransportKnowledgeGraphSnapshot } from "@/domain/transport-knowledge-graph";
import { FileTransportKnowledgeGraphRepository } from "./file-repository";
import { TransportKnowledgeGraph } from "./graph";
import { validateTransportKnowledgeGraph } from "./validate";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("transport knowledge graph", () => {
  it("loads normalized demo entities and provider-independent edges", () => {
    const snapshot = validateTransportKnowledgeGraph(demoSnapshot);
    const graph = new TransportKnowledgeGraph(snapshot);

    expect(graph.getLocation("airport-hamburg")).toMatchObject({ code: "HAM", timeZone: "Europe/Berlin" });
    expect(graph.getOutgoingEdges("airport-urumqi").map(({ mode }) => mode).sort()).toEqual(["flight", "train"]);
    expect(snapshot.edges.every((edge) => !("providerId" in edge) && !("price" in edge))).toBe(true);
  });

  it("persists and reloads a versioned snapshot", async () => {
    const directory = await makeTemporaryDirectory();
    const filePath = join(directory, "graph.json");
    const repository = new FileTransportKnowledgeGraphRepository(filePath);
    const snapshot = validateTransportKnowledgeGraph(demoSnapshot);

    await repository.save({ ...snapshot, revision: 2, updatedAt: "2026-07-22T12:00:00.000Z" });

    expect(await repository.load()).toMatchObject({ revision: 2, schemaVersion: 1 });
    expect(JSON.parse(await readFile(filePath, "utf8"))).toHaveProperty("locations", snapshot.locations);
  });

  it("rejects dangling edges and corrupt persisted data", async () => {
    const invalid = structuredClone(demoSnapshot) as unknown as TransportKnowledgeGraphSnapshot;
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
