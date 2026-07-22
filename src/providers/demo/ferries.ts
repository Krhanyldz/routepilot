import type { TransportOffer } from "@/domain/models";
import type { FerrySearchProvider } from "@/providers/interfaces";
import { DemoTransportProvider } from "./base";

export class DemoFerryProvider extends DemoTransportProvider implements FerrySearchProvider {
  readonly id = "demo-ferries";
  readonly mode = "ferry" as const;
  protected readonly offers: readonly TransportOffer[] = [];
}
