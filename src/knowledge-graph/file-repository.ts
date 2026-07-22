import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  TransportKnowledgeGraphRepository,
  TransportKnowledgeGraphSnapshot,
} from "@/domain/transport-knowledge-graph";
import { validateTransportKnowledgeGraph } from "./validate";

/** JSON persistence for server-side and development use. Writes replace snapshots atomically. */
export class FileTransportKnowledgeGraphRepository implements TransportKnowledgeGraphRepository {
  constructor(private readonly filePath: string) {}

  async load(): Promise<TransportKnowledgeGraphSnapshot> {
    const contents = await readFile(this.filePath, "utf8");
    return validateTransportKnowledgeGraph(JSON.parse(contents) as unknown);
  }

  async save(snapshot: TransportKnowledgeGraphSnapshot): Promise<void> {
    const validated = validateTransportKnowledgeGraph(snapshot);
    const directory = dirname(this.filePath);
    const temporaryPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await mkdir(directory, { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, this.filePath);
  }
}
