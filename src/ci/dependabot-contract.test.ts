import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const dependabotPath = new URL("../../.github/dependabot.yml", import.meta.url);

describe("Dependabot configuration contract", () => {
  it("groups only compatible minor and patch version updates", async () => {
    const configuration = await readFile(dependabotPath, "utf8");

    expect(configuration).toContain("production-dependencies:\n        applies-to: version-updates");
    expect(configuration).toContain("development-dependencies:\n        applies-to: version-updates");
    expect(configuration.match(/update-types:\n          - minor\n          - patch/g)).toHaveLength(2);
    expect(configuration).not.toMatch(/update-types:[\s\S]*?- major/);
  });

  it("keeps production and development dependencies in separate groups", async () => {
    const configuration = await readFile(dependabotPath, "utf8");

    expect(configuration).toContain("dependency-type: production");
    expect(configuration).toContain("dependency-type: development");
    expect(configuration).toContain("open-pull-requests-limit: 5");
  });
});
