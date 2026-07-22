import type { LiveFlightSearchProvider } from "@/providers/live-flight";
import { readAmadeusConfig, readRouteDataMode, type EnvironmentVariables } from "./config";
import { AmadeusFlightProvider } from "./provider";

export type ConfiguredFlightInventory =
  | { mode: "demo"; liveProvider: null }
  | { mode: "live"; liveProvider: LiveFlightSearchProvider };

export function configureFlightInventory(environment: EnvironmentVariables = process.env): ConfiguredFlightInventory {
  const mode = readRouteDataMode(environment);
  if (mode === "demo") return { mode, liveProvider: null };
  return { mode, liveProvider: new AmadeusFlightProvider(readAmadeusConfig(environment)) };
}
