import { buildCanonicalLocationId, createCanonicalLocation, type CanonicalLocation, type CanonicalLocationType } from "@/domain/location";

const DEMO_UPDATED_AT = "2026-07-22T00:00:00.000Z";

interface DemoLocationInput extends Omit<CanonicalLocation, "id" | "aliases" | "sources" | "lastUpdatedAt"> {
  codeOrSlug: string;
  aliases?: readonly string[];
}

const demoLocation = (input: DemoLocationInput): CanonicalLocation => createCanonicalLocation({
  ...input,
  id: buildCanonicalLocationId({ type: input.type, countryCode: input.countryCode, primaryCodeOrSlug: input.codeOrSlug }),
  aliases: input.aliases ?? [],
  sources: [{ sourceId: "demo-global-locations", sourceRecordId: input.codeOrSlug, sourceType: "demo", retrievedAt: DEMO_UPDATED_AT }],
  lastUpdatedAt: DEMO_UPDATED_AT,
});

export const demoGlobalLocations: readonly CanonicalLocation[] = [
  demoLocation({ codeOrSlug: "bremen", name: "Bremen", city: "Bremen", countryCode: "DE", latitude: 53.0793, longitude: 8.8017, timeZone: "Europe/Berlin", type: "city" }),
  demoLocation({ codeOrSlug: "BRE", name: "Bremen Airport", city: "Bremen", countryCode: "DE", latitude: 53.0475, longitude: 8.7867, timeZone: "Europe/Berlin", type: "airport", iataCode: "BRE" }),
  demoLocation({ codeOrSlug: "HAM", name: "Hamburg Airport", city: "Hamburg", countryCode: "DE", latitude: 53.6304, longitude: 9.9882, timeZone: "Europe/Berlin", type: "airport", iataCode: "HAM" }),
  demoLocation({ codeOrSlug: "HAJ", name: "Hannover Airport", city: "Hannover", countryCode: "DE", latitude: 52.4611, longitude: 9.6851, timeZone: "Europe/Berlin", type: "airport", iataCode: "HAJ", aliases: ["Hanover Airport"] }),
  demoLocation({ codeOrSlug: "FMO", name: "Münster/Osnabrück Airport", city: "Münster/Osnabrück", countryCode: "DE", latitude: 52.1346, longitude: 7.6848, timeZone: "Europe/Berlin", type: "airport", iataCode: "FMO" }),
  demoLocation({ codeOrSlug: "DTM", name: "Dortmund Airport", city: "Dortmund", countryCode: "DE", latitude: 51.5183, longitude: 7.6122, timeZone: "Europe/Berlin", type: "airport", iataCode: "DTM" }),
  demoLocation({ codeOrSlug: "AMS", name: "Amsterdam Airport Schiphol", city: "Amsterdam", countryCode: "NL", latitude: 52.3086, longitude: 4.7639, timeZone: "Europe/Amsterdam", type: "airport", iataCode: "AMS", aliases: ["Schiphol"] }),
  demoLocation({ codeOrSlug: "DEBRE", name: "Bremen Hauptbahnhof", city: "Bremen", countryCode: "DE", latitude: 53.0833, longitude: 8.8138, timeZone: "Europe/Berlin", type: "railway-station", stationCode: "DEBRE", aliases: ["Bremen Hbf"] }),
  demoLocation({ codeOrSlug: "DEHAM", name: "Hamburg Hauptbahnhof", city: "Hamburg", countryCode: "DE", latitude: 53.5528, longitude: 10.0067, timeZone: "Europe/Berlin", type: "railway-station", stationCode: "DEHAM", aliases: ["Hamburg Hbf"] }),
  demoLocation({ codeOrSlug: "DEHAN", name: "Hannover Hauptbahnhof", city: "Hannover", countryCode: "DE", latitude: 52.3768, longitude: 9.7417, timeZone: "Europe/Berlin", type: "railway-station", stationCode: "DEHAN", aliases: ["Hannover Hbf"] }),
  demoLocation({ codeOrSlug: "DEBRV", name: "Bremerhaven Hauptbahnhof", city: "Bremerhaven", countryCode: "DE", latitude: 53.5352, longitude: 8.5993, timeZone: "Europe/Berlin", type: "railway-station", stationCode: "DEBRV", aliases: ["Bremerhaven Hbf"] }),
  demoLocation({ codeOrSlug: "DEBRV-COLUMBUSKAJE", name: "Columbuskaje Ferry Terminal", city: "Bremerhaven", countryCode: "DE", latitude: 53.5718, longitude: 8.5543, timeZone: "Europe/Berlin", type: "ferry-terminal", portCode: "DEBRV" }),
];

export function isDemoLocationType(location: CanonicalLocation, type: CanonicalLocationType): boolean {
  return location.type === type;
}
