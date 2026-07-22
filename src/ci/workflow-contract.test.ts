import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workflowPath = new URL("../../.github/workflows/ci.yml", import.meta.url);

describe("CI workflow contract", () => {
  it("runs every required completion check", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    for (const command of ["npm ci", "npm run lint", "npm run typecheck", "npm test", "npm run build"]) {
      expect(workflow).toContain(`run: ${command}`);
    }
  });

  it("enforces production audit, least privilege, timeouts, and locked Node version", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain("npm audit --omit=dev --audit-level=high");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow.match(/actions\/checkout@v7/g)).toHaveLength(2);
    expect(workflow.match(/actions\/setup-node@v7/g)).toHaveLength(2);
    expect(workflow.match(/timeout-minutes: 15/g)).toHaveLength(2);
    expect(workflow.match(/node-version-file: .nvmrc/g)).toHaveLength(2);
  });
});
