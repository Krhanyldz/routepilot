import type { PricedLeg, TransportOffer, TravelerOptions } from "@/domain/models";

export function priceOffer(offer: TransportOffer, options: TravelerOptions): PricedLeg {
  if (offer.price < 0) throw new Error("Transport prices cannot be negative");
  const discountedPrice = offer.deutschlandticketEligible && options.hasDeutschlandticket ? 0 : offer.price;
  return { ...offer, basePrice: offer.price, price: discountedPrice };
}
