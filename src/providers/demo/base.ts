import type { TransportMode, TransportOffer } from "@/domain/models";
import type { TransportSearchProvider, TransportSearchQuery } from "@/providers/interfaces";

export abstract class DemoTransportProvider implements TransportSearchProvider {
  abstract readonly id: string;
  abstract readonly mode: TransportMode;
  protected abstract readonly offers: readonly TransportOffer[];

  search(query: TransportSearchQuery): readonly TransportOffer[] {
    return this.offers.filter((offer) =>
      (!query.originLocationIds || query.originLocationIds.includes(offer.fromLocationId)) &&
      (!query.destinationLocationId || offer.toLocationId === query.destinationLocationId),
    );
  }
}
