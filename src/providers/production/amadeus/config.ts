export type AmadeusEnvironment = "test" | "production";

export interface AmadeusConfig {
  clientId: string;
  clientSecret: string;
  environment: AmadeusEnvironment;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

export type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export function readAmadeusConfig(environment: EnvironmentVariables = process.env): AmadeusConfig {
  const clientId = environment.AMADEUS_CLIENT_ID?.trim();
  const clientSecret = environment.AMADEUS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Amadeus live mode requires AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET");
  }
  const amadeusEnvironment = environment.AMADEUS_ENVIRONMENT ?? "test";
  if (amadeusEnvironment !== "test" && amadeusEnvironment !== "production") {
    throw new Error("AMADEUS_ENVIRONMENT must be test or production");
  }
  return {
    clientId,
    clientSecret,
    environment: amadeusEnvironment,
    baseUrl: amadeusEnvironment === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com",
    timeoutMs: 8_000,
    maxRetries: 1,
  };
}

export type RouteDataMode = "demo" | "live";

export function readRouteDataMode(environment: EnvironmentVariables = process.env): RouteDataMode {
  const mode = environment.ROUTE_DATA_MODE ?? "demo";
  if (mode !== "demo" && mode !== "live") throw new Error("ROUTE_DATA_MODE must be demo or live");
  return mode;
}
