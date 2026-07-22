import type { LiveFlightSearchProvider } from "@/providers/live-flight";
import type { AirportSearchProvider, GeocodingProvider } from "@/providers/location-interfaces";
import { AmadeusApiClient } from "./client";
import { readAmadeusConfig, readRouteDataMode, type EnvironmentVariables } from "./config";
import { AmadeusLocationProvider } from "./location-provider";
import { AmadeusFlightProvider } from "./provider";

export type ConfiguredFlightInventory =
  | { mode: "demo"; liveProvider: null }
  | { mode: "live"; liveProvider: LiveFlightSearchProvider };

export function configureFlightInventory(environment: EnvironmentVariables = process.env): ConfiguredFlightInventory {
  const mode = readRouteDataMode(environment);
  if (mode === "demo") return { mode, liveProvider: null };
  return { mode, liveProvider: new AmadeusFlightProvider(readAmadeusConfig(environment)) };
}

export function configureLocationSearch(
  environment: EnvironmentVariables = process.env,
): AirportSearchProvider & GeocodingProvider {
  return new AmadeusLocationProvider(new AmadeusApiClient(readAmadeusConfig(environment)));
}
