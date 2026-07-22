export type ApiRouteName = "flight-search" | "location-search";

export interface ApiCompletionEvent {
  timestamp: string;
  level: "info" | "error";
  event: "api.request.completed";
  route: ApiRouteName;
  method: "GET" | "POST";
  requestId: string;
  traceId: string;
  spanId: string;
  status: number;
  outcome: string;
  durationMs: number;
}

export interface ApiObservation {
  complete(status: number, outcome: string): ApiCompletionEvent;
}

export type ApiEventWriter = (event: ApiCompletionEvent) => void;

export interface TraceContext {
  traceId: string;
  spanId: string;
  flags: "00" | "01";
  traceparent: string;
}

export function createTraceContext(parent: string | null, randomHex: (length: number) => string = secureRandomHex): TraceContext {
  const parsed = parseTraceparent(parent);
  const traceId = parsed?.traceId ?? nonZeroHex(32, randomHex);
  const spanId = nonZeroHex(16, randomHex);
  const flags = parsed?.flags ?? "00";
  return { traceId, spanId, flags, traceparent: `00-${traceId}-${spanId}-${flags}` };
}

export function apiOutcome(body: unknown): string {
  if (typeof body !== "object" || body === null) return "unknown";
  const record = body as Record<string, unknown>;
  return typeof record.reason === "string" ? record.reason : typeof record.status === "string" ? record.status : "unknown";
}

export function observeApiRequest(
  route: ApiRouteName,
  method: ApiCompletionEvent["method"],
  requestId: string,
  dependencies: {
    now?: () => number;
    timestamp?: () => Date;
    write?: ApiEventWriter;
    trace?: TraceContext;
  } = {},
): ApiObservation {
  const now = dependencies.now ?? performance.now.bind(performance);
  const timestamp = dependencies.timestamp ?? (() => new Date());
  const write = dependencies.write ?? writeJsonEvent;
  const trace = dependencies.trace ?? createTraceContext(null);
  const startedAt = now();
  let completed = false;
  let completion: ApiCompletionEvent | undefined;

  return {
    complete(status, outcome) {
      if (completed && completion) return completion;
      completed = true;
      completion = {
        timestamp: timestamp().toISOString(),
        level: status >= 500 ? "error" : "info",
        event: "api.request.completed",
        route,
        method,
        requestId,
        traceId: trace.traceId,
        spanId: trace.spanId,
        status,
        outcome,
        durationMs: Math.max(0, Math.round((now() - startedAt) * 100) / 100),
      };
      write(completion);
      return completion;
    },
  };
}

function parseTraceparent(value: string | null): Pick<TraceContext, "traceId" | "flags"> | undefined {
  if (!value) return undefined;
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-(00|01)$/.exec(value.trim());
  if (!match || /^0+$/.test(match[1]) || /^0+$/.test(match[2])) return undefined;
  return { traceId: match[1], flags: match[3] as "00" | "01" };
}

function secureRandomHex(length: number): string {
  let value = "";
  while (value.length < length) value += crypto.randomUUID().replaceAll("-", "");
  return value.slice(0, length);
}

function nonZeroHex(length: number, randomHex: (length: number) => string): string {
  const value = randomHex(length);
  if (!new RegExp(`^[0-9a-f]{${length}}$`).test(value) || /^0+$/.test(value)) {
    throw new Error(`Trace generator must return ${length} non-zero lowercase hexadecimal characters`);
  }
  return value;
}

function writeJsonEvent(event: ApiCompletionEvent): void {
  const line = JSON.stringify(event);
  if (event.level === "error") console.error(line);
  else console.info(line);
}
