import { describe, expect, it, vi } from "vitest";
import {
  configureTravelpayoutsLocationSearch,
  TravelpayoutsLocationProvider,
} from "./location-provider";

const cities = [
  {
    code: "LON",
    name: "London",
    coordinates: { lon: -0.1276, lat: 51.5072 },
    time_zone: "Europe/London",
    name_translations: { en: "London", tr: "Londra" },
    country_code: "GB",
  },
  {
    code: "TYO",
    name: "Tokyo",
    coordinates: { lon: 139.6917, lat: 35.6895 },
    time_zone: "Asia/Tokyo",
    name_translations: { en: "Tokyo" },
    country_code: "JP",
  },
];

const airports = [
  {
    code: "LHR",
    name: "Heathrow Airport",
    coordinates: { lon: -0.4543, lat: 51.47 },
    time_zone: "Europe/London",
    name_translations: { en: "Heathrow Airport" },
    country_code: "GB",
    city_code: "LON",
  },
  {
    code: "HND",
    name: "Haneda Airport",
    coordinates: { lon: 139.7798, lat: 35.5494 },
    time_zone: "Asia/Tokyo",
    name_translations: { en: "Tokyo Haneda" },
    country_code: "JP",
    city_code: "TYO",
  },
];

describe("Travelpayouts worldwide location provider", () => {
  it("requires a server-side API token", () => {
    expect(() => configureTravelpayoutsLocationSearch({})).toThrow("TRAVELPAYOUTS_API_TOKEN is required");
  });

  it("searches cities and airports by name, translation, and IATA code", async () => {
    const fetchMock = datasetFetch();
    const provider = new TravelpayoutsLocationProvider("secret", fetchMock, () => Date.parse("2026-07-22T12:00:00.000Z"));

    await expect(provider.geocode({ query: "Londra", limit: 8 })).resolves.toEqual([
      expect.objectContaining({ type: "city", city: "London", iataCode: "LON" }),
      expect.objectContaining({ type: "airport", city: "London", iataCode: "LHR" }),
    ]);
    await expect(provider.searchAirports({ query: "HND", limit: 8 })).resolves.toEqual([
      expect.objectContaining({ type: "airport", city: "Tokyo", iataCode: "HND" }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([, init]) => new Headers(init?.headers).get("X-Access-Token") === "secret")).toBe(true);
  });

  it("shares a successful dataset and retries after an unavailable API", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockImplementation(datasetResponse);
    const provider = new TravelpayoutsLocationProvider("secret", fetchMock);

    await expect(provider.geocode({ query: "London" })).rejects.toMatchObject({ code: "upstream" });
    await expect(provider.geocode({ query: "London" })).resolves.toHaveLength(2);
    await expect(provider.geocode({ query: "Tokyo" })).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("returns an explicit provider error instead of fallback data", async () => {
    const provider = new TravelpayoutsLocationProvider(
      "secret",
      vi.fn<typeof fetch>().mockResolvedValue(new Response("unavailable", { status: 503 })),
    );
    await expect(provider.geocode({ query: "Anywhere" })).rejects.toMatchObject({
      code: "upstream",
      retryable: true,
    });
  });
});

function datasetFetch(): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.fn<typeof fetch>(datasetResponse);
}

function datasetResponse(input: string | URL | Request): Promise<Response> {
  return Promise.resolve(Response.json(String(input).includes("cities.json") ? cities : airports));
}
