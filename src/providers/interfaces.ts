import type { Location, TransportMode, TransportOffer } from "@/domain/models";

export interface TransportSearchQuery {
  originLocationIds?: readonly string[];
  destinationLocationId?: string;
}

export interface TransportSearchProvider {
  readonly id: string;
  readonly mode: TransportMode;
  search(query: TransportSearchQuery): readonly TransportOffer[];
}

export interface FlightSearchProvider extends TransportSearchProvider {
  readonly mode: "flight";
}

export interface TrainSearchProvider extends TransportSearchProvider {
  readonly mode: "train";
}

export interface FerrySearchProvider extends TransportSearchProvider {
  readonly mode: "ferry";
}

export interface LocationSearchProvider {
  readonly id: string;
  getById(id: string): Location | undefined;
  searchByCity(city: string): readonly Location[];
  listDeparturePoints(): readonly Location[];
}
