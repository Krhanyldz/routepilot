export const TRANSPORT_MODES = ["flight", "train", "ferry"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export type LocationType = "city" | "airport" | "station" | "port";

export interface Location {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  type: LocationType;
  latitude: number;
  longitude: number;
  code?: string;
}

export interface TransportOffer {
  id: string;
  providerId: string;
  dataSource: "demo" | "live";
  fromLocationId: string;
  toLocationId: string;
  mode: TransportMode;
  price: number;
  durationMinutes: number;
  transfers: number;
  positioning?: boolean;
  selfTransfer?: boolean;
  deutschlandticketEligible?: boolean;
  label?: string;
}

export interface PricedLeg extends TransportOffer {
  basePrice: number;
}

export interface Route {
  legs: PricedLeg[];
  totalCost: number;
  totalDurationMinutes: number;
  totalTransfers: number;
}

export interface TravelerOptions {
  hasDeutschlandticket: boolean;
}

export interface SearchConstraints extends TravelerOptions {
  nearbyDeparturesEnabled: boolean;
  radiusKm: 50 | 100 | 150 | 250;
  allowedModes: readonly TransportMode[];
  maxDurationMinutes: number;
  maxTransfers: number;
}
