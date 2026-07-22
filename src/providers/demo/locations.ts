import type { Location } from "@/domain/models";
import type { LocationSearchProvider } from "@/providers/interfaces";

export const demoLocations: readonly Location[] = [
  { id: "city-bremen", name: "Bremen", city: "Bremen", countryCode: "DE", type: "city", latitude: 53.0793, longitude: 8.8017 },
  { id: "airport-bremen", name: "Bremen Airport", city: "Bremen", countryCode: "DE", type: "airport", latitude: 53.0475, longitude: 8.7867, code: "BRE" },
  { id: "airport-hamburg", name: "Hamburg Airport", city: "Hamburg", countryCode: "DE", type: "airport", latitude: 53.6304, longitude: 9.9882, code: "HAM" },
  { id: "airport-hannover", name: "Hannover Airport", city: "Hannover", countryCode: "DE", type: "airport", latitude: 52.4611, longitude: 9.6851, code: "HAJ" },
  { id: "airport-fmo", name: "Münster/Osnabrück Airport", city: "Münster/Osnabrück", countryCode: "DE", type: "airport", latitude: 52.1346, longitude: 7.6848, code: "FMO" },
  { id: "airport-dortmund", name: "Dortmund Airport", city: "Dortmund", countryCode: "DE", type: "airport", latitude: 51.5183, longitude: 7.6122, code: "DTM" },
  { id: "airport-amsterdam", name: "Amsterdam Airport Schiphol", city: "Amsterdam", countryCode: "NL", type: "airport", latitude: 52.3086, longitude: 4.7639, code: "AMS" },
  { id: "airport-antalya", name: "Antalya Airport", city: "Antalya", countryCode: "TR", type: "airport", latitude: 36.8987, longitude: 30.8005, code: "AYT" },
  { id: "airport-istanbul", name: "Istanbul Airport", city: "Istanbul", countryCode: "TR", type: "airport", latitude: 41.2753, longitude: 28.7519, code: "IST" },
  { id: "airport-urumqi", name: "Ürümqi Diwopu Airport", city: "Ürümqi", countryCode: "CN", type: "airport", latitude: 43.9071, longitude: 87.4742, code: "URC" },
  { id: "station-baotou", name: "Baotou Railway Station", city: "Baotou", countryCode: "CN", type: "station", latitude: 40.6574, longitude: 109.8403, code: "BTC" },
];

export class DemoLocationProvider implements LocationSearchProvider {
  readonly id = "demo-locations";

  getById(id: string): Location | undefined {
    return demoLocations.find((location) => location.id === id);
  }

  searchByCity(city: string): readonly Location[] {
    return demoLocations.filter((location) => location.city.localeCompare(city, undefined, { sensitivity: "accent" }) === 0);
  }

  listDeparturePoints(): readonly Location[] {
    return demoLocations.filter((location) => ["city-bremen", "airport-bremen", "airport-hamburg", "airport-hannover", "airport-fmo", "airport-dortmund", "airport-amsterdam"].includes(location.id));
  }
}
