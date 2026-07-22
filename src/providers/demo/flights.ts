import type { FlightSearchProvider } from "@/providers/interfaces";
import { DemoTransportProvider } from "./base";

export class DemoFlightProvider extends DemoTransportProvider implements FlightSearchProvider {
  readonly id = "demo-flights";
  readonly mode = "flight" as const;
  protected readonly offers = [
    { id: "bre-ayt", providerId: this.id, dataSource: "demo", fromLocationId: "city-bremen", toLocationId: "airport-antalya", mode: this.mode, price: 300, durationMinutes: 210, transfers: 0, label: "Direct demo fare" },
    { id: "ham-ayt", providerId: this.id, dataSource: "demo", fromLocationId: "airport-hamburg", toLocationId: "airport-antalya", mode: this.mode, price: 59, durationMinutes: 220, transfers: 0, label: "Demo fare" },
    { id: "ham-ist", providerId: this.id, dataSource: "demo", fromLocationId: "airport-hamburg", toLocationId: "airport-istanbul", mode: this.mode, price: 49, durationMinutes: 195, transfers: 0, label: "Demo fare" },
    { id: "ist-urc", providerId: this.id, dataSource: "demo", fromLocationId: "airport-istanbul", toLocationId: "airport-urumqi", mode: this.mode, price: 240, durationMinutes: 350, transfers: 0, selfTransfer: true, label: "Demo self-transfer" },
    { id: "urc-btc-flight", providerId: this.id, dataSource: "demo", fromLocationId: "airport-urumqi", toLocationId: "station-baotou", mode: this.mode, price: 75, durationMinutes: 95, transfers: 0, label: "Demo fare" },
  ] as const;
}
