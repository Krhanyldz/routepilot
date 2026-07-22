import type { TrainSearchProvider } from "@/providers/interfaces";
import { DemoTransportProvider } from "./base";

export class DemoTrainProvider extends DemoTransportProvider implements TrainSearchProvider {
  readonly id = "demo-trains";
  readonly mode = "train" as const;
  protected readonly offers = [
    { id: "bre-ham", providerId: this.id, dataSource: "demo", fromLocationId: "city-bremen", toLocationId: "airport-hamburg", mode: this.mode, price: 20, durationMinutes: 75, transfers: 0, positioning: true, deutschlandticketEligible: true, label: "Demo regional fare" },
    { id: "urc-btc-train", providerId: this.id, dataSource: "demo", fromLocationId: "airport-urumqi", toLocationId: "station-baotou", mode: this.mode, price: 40, durationMinutes: 390, transfers: 0, label: "Demo fare" },
  ] as const;
}
