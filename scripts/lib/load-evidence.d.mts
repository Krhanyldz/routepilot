export interface LoadConfiguration {
  baseUrl: string;
  requests: number;
  concurrency: number;
  maximumP95Ms: number;
  maximumErrorRate: number;
}

export interface LoadSummary {
  requests: number;
  failures: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  passed: boolean;
}

export function parseLoadConfiguration(
  environment: Record<string, string | undefined>,
  argument?: string,
): LoadConfiguration;

export function summarizeLoadResults(
  durations: number[],
  failures: number,
  configuration: Pick<LoadConfiguration, "maximumP95Ms" | "maximumErrorRate">,
): LoadSummary;
