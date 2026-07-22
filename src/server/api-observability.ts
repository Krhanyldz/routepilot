export type ApiRouteName = "flight-search" | "location-search";

export interface ApiCompletionEvent {
  timestamp: string;
  level: "info" | "error";
  event: "api.request.completed";
  route: ApiRouteName;
  method: "GET" | "POST";
  requestId: string;
  status: number;
  outcome: string;
  durationMs: number;
}

export interface ApiObservation {
  complete(status: number, outcome: string): void;
}

export type ApiEventWriter = (event: ApiCompletionEvent) => void;

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
  } = {},
): ApiObservation {
  const now = dependencies.now ?? performance.now.bind(performance);
  const timestamp = dependencies.timestamp ?? (() => new Date());
  const write = dependencies.write ?? writeJsonEvent;
  const startedAt = now();
  let completed = false;

  return {
    complete(status, outcome) {
      if (completed) return;
      completed = true;
      write({
        timestamp: timestamp().toISOString(),
        level: status >= 500 ? "error" : "info",
        event: "api.request.completed",
        route,
        method,
        requestId,
        status,
        outcome,
        durationMs: Math.max(0, Math.round((now() - startedAt) * 100) / 100),
      });
    },
  };
}

function writeJsonEvent(event: ApiCompletionEvent): void {
  const line = JSON.stringify(event);
  if (event.level === "error") console.error(line);
  else console.info(line);
}
