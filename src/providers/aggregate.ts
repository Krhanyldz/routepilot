import type { TransportMode, TransportOffer } from "@/domain/models";
import type { TransportSearchProvider, TransportSearchQuery } from "./interfaces";

export function aggregateTransportOffers(
  providers: readonly TransportSearchProvider[],
  allowedModes: readonly TransportMode[],
  query: TransportSearchQuery = {},
): TransportOffer[] {
  const allowed = new Set(allowedModes);
  return providers
    .filter((provider) => allowed.has(provider.mode))
    .flatMap((provider) => provider.search(query));
}
