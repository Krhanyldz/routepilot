import {
  buildCanonicalLocationId,
  createCanonicalLocation,
  type CanonicalLocation,
} from "@/domain/location";
import {
  LocationSearchProviderError,
  type AirportSearchProvider,
  type GeocodingProvider,
  type LocationTextSearchQuery,
} from "@/providers/location-interfaces";

type Fetch = typeof fetch;
type Environment = Readonly<Record<string, string | undefined>>;

interface TravelpayoutsCity {
  code: string;
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  aliases: readonly string[];
}

interface TravelpayoutsDataset {
  cities: readonly CanonicalLocation[];
  airports: readonly CanonicalLocation[];
  airportCountsByCityCode: ReadonlyMap<string, number>;
}

export function configureTravelpayoutsLocationSearch(
  environment: Environment = process.env,
  fetchImpl: Fetch = fetch,
): TravelpayoutsLocationProvider {
  const token = environment.TRAVELPAYOUTS_API_TOKEN?.trim();
  if (!token) throw new LocationSearchProviderError("authentication", "TRAVELPAYOUTS_API_TOKEN is required", false);
  return new TravelpayoutsLocationProvider(token, fetchImpl);
}

export class TravelpayoutsLocationProvider implements AirportSearchProvider, GeocodingProvider {
  readonly id = "travelpayouts-data";
  private datasetPromise: Promise<TravelpayoutsDataset> | undefined;

  constructor(
    private readonly token: string,
    private readonly fetchImpl: Fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async searchAirports(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]> {
    validateQuery(query);
    return rankLocations((await this.dataset()).airports, query);
  }

  async geocode(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]> {
    validateQuery(query);
    const dataset = await this.dataset();
    return rankLocations([...dataset.cities, ...dataset.airports], query, dataset.airportCountsByCityCode);
  }

  private dataset(): Promise<TravelpayoutsDataset> {
    if (this.datasetPromise) return this.datasetPromise;
    const request = this.loadDataset();
    this.datasetPromise = request;
    void request.catch(() => {
      if (this.datasetPromise === request) this.datasetPromise = undefined;
    });
    return request;
  }

  private async loadDataset(): Promise<TravelpayoutsDataset> {
    const [cityPayload, airportPayload] = await Promise.all([
      this.fetchJson("https://api.travelpayouts.com/data/en/cities.json"),
      this.fetchJson("https://api.travelpayouts.com/data/en/airports.json"),
    ]);
    if (!Array.isArray(cityPayload) || !Array.isArray(airportPayload)) throw malformed("dataset root");
    const rawCities = cityPayload.flatMap((value) => normalizeCity(value));
    const cityByCode = new Map(rawCities.map((city) => [city.code, city]));
    const airportCountsByCityCode = airportPayload.reduce((counts, value) => {
      const cityCode = isRecord(value) ? codeValue(value.city_code) : undefined;
      if (cityCode) counts.set(cityCode, (counts.get(cityCode) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
    const retrievedAt = new Date(this.now()).toISOString();
    const cities = rawCities.map((city) => canonicalCity(city, this.id, retrievedAt));
    const airports = airportPayload.flatMap((value) => normalizeAirport(value, cityByCode, this.id, retrievedAt));
    if (!cities.length || !airports.length) throw malformed("empty dataset");
    return { cities, airports, airportCountsByCityCode };
  }

  private async fetchJson(url: string): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate", "X-Access-Token": this.token },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new LocationSearchProviderError("timeout", "Travelpayouts data request timed out", true, { cause: error });
      }
      throw new LocationSearchProviderError("upstream", "Travelpayouts data request failed", true, { cause: error });
    }
    if (response.status === 401 || response.status === 403) throw new LocationSearchProviderError("authentication", "Travelpayouts rejected the API token", false);
    if (response.status === 429) throw new LocationSearchProviderError("rate-limit", "Travelpayouts rate limit exceeded", true);
    if (!response.ok) throw new LocationSearchProviderError("upstream", `Travelpayouts returned HTTP ${response.status}`, response.status >= 500);
    try {
      return await response.json();
    } catch (error) {
      throw new LocationSearchProviderError("invalid-response", "Travelpayouts returned malformed JSON", false, { cause: error });
    }
  }
}

function normalizeCity(value: unknown): TravelpayoutsCity[] {
  if (!isRecord(value)) return [];
  const code = codeValue(value.code);
  const name = stringValue(value.name);
  const countryCode = countryValue(value.country_code);
  const coordinates = coordinatesValue(value.coordinates);
  const timeZone = stringValue(value.time_zone);
  if (!code || !name || !countryCode || !coordinates || !validTimeZone(timeZone)) return [];
  return [{ code, name, countryCode, ...coordinates, timeZone, aliases: translations(value.name_translations) }];
}

function normalizeAirport(
  value: unknown,
  cityByCode: ReadonlyMap<string, TravelpayoutsCity>,
  providerId: string,
  retrievedAt: string,
): CanonicalLocation[] {
  if (!isRecord(value)) return [];
  const iataCode = codeValue(value.code);
  const name = stringValue(value.name);
  const countryCode = countryValue(value.country_code);
  const cityCode = codeValue(value.city_code);
  const city = cityCode ? cityByCode.get(cityCode) : undefined;
  const coordinates = coordinatesValue(value.coordinates);
  const timeZone = stringValue(value.time_zone);
  if (!iataCode || !name || !countryCode || !coordinates || !validTimeZone(timeZone)) return [];
  return [createCanonicalLocation({
    id: buildCanonicalLocationId({ type: "airport", countryCode, primaryCodeOrSlug: iataCode }),
    name,
    city: city?.name ?? name,
    countryCode,
    ...coordinates,
    timeZone,
    type: "airport",
    iataCode,
    aliases: unique([...(city?.aliases ?? []), ...translations(value.name_translations), city?.name].filter(isString)),
    sources: [{ sourceId: providerId, sourceRecordId: iataCode, sourceType: "aggregator", retrievedAt }],
    lastUpdatedAt: retrievedAt,
  })];
}

function canonicalCity(city: TravelpayoutsCity, providerId: string, retrievedAt: string): CanonicalLocation {
  return createCanonicalLocation({
    id: buildCanonicalLocationId({ type: "city", countryCode: city.countryCode, primaryCodeOrSlug: city.code }),
    name: city.name,
    city: city.name,
    countryCode: city.countryCode,
    latitude: city.latitude,
    longitude: city.longitude,
    timeZone: city.timeZone,
    type: "city",
    iataCode: city.code,
    aliases: city.aliases,
    sources: [{ sourceId: providerId, sourceRecordId: city.code, sourceType: "aggregator", retrievedAt }],
    lastUpdatedAt: retrievedAt,
  });
}

function rankLocations(
  locations: readonly CanonicalLocation[],
  query: LocationTextSearchQuery,
  airportCountsByCityCode: ReadonlyMap<string, number> = new Map(),
): CanonicalLocation[] {
  const needle = searchable(query.query);
  const countries = query.countryCodes ? new Set(query.countryCodes) : undefined;
  return locations
    .filter((location) => !countries || countries.has(location.countryCode))
    .map((location) => ({ location, score: matchScore(location, needle) }))
    .filter((entry) => entry.score < Number.POSITIVE_INFINITY)
    .sort((left, right) => left.score - right.score
      || Number(left.location.type !== "city") - Number(right.location.type !== "city")
      || (airportCountsByCityCode.get(right.location.iataCode ?? "") ?? 0) - (airportCountsByCityCode.get(left.location.iataCode ?? "") ?? 0)
      || left.location.name.localeCompare(right.location.name))
    .slice(0, query.limit ?? 10)
    .map((entry) => entry.location);
}

function matchScore(location: CanonicalLocation, needle: string): number {
  const code = searchable(location.iataCode ?? "");
  const fields = [location.city, location.name, ...location.aliases].map(searchable);
  if (code === needle) return 0;
  if (fields.some((field) => field === needle)) return 1;
  if (code.startsWith(needle)) return 2;
  if (fields.some((field) => field.startsWith(needle))) return 3;
  if (fields.some((field) => field.includes(needle))) return 4;
  return Number.POSITIVE_INFINITY;
}

function validateQuery(query: LocationTextSearchQuery): void {
  const value = query.query.trim();
  if (value.length < 2 || value.length > 80) throw new LocationSearchProviderError("invalid-request", "Location query must contain 2 to 80 characters", false);
  if (query.limit !== undefined && (!Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 20)) {
    throw new LocationSearchProviderError("invalid-request", "Location limit must be from 1 to 20", false);
  }
}

function coordinatesValue(value: unknown): { latitude: number; longitude: number } | undefined {
  if (!isRecord(value) || typeof value.lat !== "number" || typeof value.lon !== "number") return undefined;
  if (!Number.isFinite(value.lat) || !Number.isFinite(value.lon) || value.lat < -90 || value.lat > 90 || value.lon < -180 || value.lon > 180) return undefined;
  return { latitude: value.lat, longitude: value.lon };
}

function translations(value: unknown): string[] {
  return isRecord(value) ? unique(Object.values(value).filter(isString)) : [];
}

function searchable(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en").trim();
}

function codeValue(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : undefined;
}

function countryValue(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function validTimeZone(value: string | undefined): value is string {
  return typeof value === "string" && value.includes("/");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function malformed(part: string): LocationSearchProviderError {
  return new LocationSearchProviderError("invalid-response", `Travelpayouts returned an invalid ${part}`, false);
}
