#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { parseLoadConfiguration, summarizeLoadResults } from "./lib/load-evidence.mjs";

const configuration = parseLoadConfiguration(process.env, process.argv[2]);
const durations = [];
let failures = 0;
let cursor = 0;

await Promise.all(Array.from({ length: configuration.concurrency }, async () => {
  while (cursor < configuration.requests) {
    cursor += 1;
    const startedAt = performance.now();
    try {
      const response = await fetch(`${configuration.baseUrl}/api/health`, {
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status !== 200 || (await response.json()).status !== "ready") failures += 1;
    } catch {
      failures += 1;
    } finally {
      durations.push(Number((performance.now() - startedAt).toFixed(2)));
    }
  }
}));

const summary = summarizeLoadResults(durations, failures, configuration);
console.log(JSON.stringify({
  event: "load.completed",
  target: configuration.baseUrl,
  concurrency: configuration.concurrency,
  thresholds: { maximumP95Ms: configuration.maximumP95Ms, maximumErrorRate: configuration.maximumErrorRate },
  ...summary,
}));
if (!summary.passed) process.exitCode = 1;
