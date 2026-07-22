import { TRANSPORT_MODES, type TransportMode } from "@/domain/models";

export const PREFERRED_BALANCES = ["cheapest", "fastest", "smartest"] as const;
export type PreferredBalance = (typeof PREFERRED_BALANCES)[number];

export interface TravelRequest {
  origin: string;
  destination: string;
  departureFlexibilityDays: number;
  returnFlexibilityDays: number;
  budget: number | null;
  preferredTransportModes: readonly TransportMode[];
  avoidTransportModes: readonly TransportMode[];
  maximumTransfers: number;
  maximumDurationMinutes: number;
  nearbyDepartureEnabled: boolean;
  searchRadiusKm: 50 | 100 | 150 | 250;
  hasDeutschlandticket: boolean;
  selfTransferAllowed: boolean;
  preferredBalance: PreferredBalance;
}

export const defaultTravelRequest: TravelRequest = {
  origin: "",
  destination: "",
  departureFlexibilityDays: 0,
  returnFlexibilityDays: 0,
  budget: null,
  preferredTransportModes: TRANSPORT_MODES,
  avoidTransportModes: [],
  maximumTransfers: 4,
  maximumDurationMinutes: 48 * 60,
  nearbyDepartureEnabled: true,
  searchRadiusKm: 150,
  hasDeutschlandticket: false,
  selfTransferAllowed: false,
  preferredBalance: "smartest",
};

export function validateTravelRequest(request: TravelRequest): TravelRequest {
  if (!request.origin.trim() || !request.destination.trim()) throw new Error("Origin and destination are required");
  assertWholeNumber(request.departureFlexibilityDays, "Departure flexibility");
  assertWholeNumber(request.returnFlexibilityDays, "Return flexibility");
  assertWholeNumber(request.maximumTransfers, "Maximum transfers");
  if (!Number.isSafeInteger(request.maximumDurationMinutes) || request.maximumDurationMinutes <= 0) {
    throw new Error("Maximum duration must be a positive whole number");
  }
  if (request.budget !== null && (!Number.isFinite(request.budget) || request.budget < 0)) {
    throw new Error("Budget must be nonnegative");
  }
  const supportedModes = new Set<string>(TRANSPORT_MODES);
  for (const mode of [...request.preferredTransportModes, ...request.avoidTransportModes]) {
    if (!supportedModes.has(mode)) throw new Error(`Unsupported transport mode: ${mode}`);
  }
  if (request.preferredTransportModes.some((mode) => request.avoidTransportModes.includes(mode))) {
    throw new Error("A transport mode cannot be both preferred and avoided");
  }
  return request;
}

function assertWholeNumber(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative whole number`);
}
