import { evaluateReadiness } from "@/application/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  const report = evaluateReadiness();
  return Response.json(report, {
    status: report.status === "ready" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
