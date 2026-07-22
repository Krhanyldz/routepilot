import { describe, expect, it, vi } from "vitest";
import { LiveFlightProviderError } from "@/providers/live-flight";
import { readAmadeusConfig } from "./config";
import { configureFlightInventory } from "./factory";
import { AMADEUS_COVERAGE_WARNING, AmadeusFlightProvider } from "./provider";

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  environment: "test" as const,
  baseUrl: "https://test.api.amadeus.com",
  timeoutMs: 1_000,
  maxRetries: 1,
};

const query = {
  originIataCode: "HAM",
  destinationIataCode: "AYT",
  departureDate: "2026-09-10",
  adults: 1,
  currencyCode: "EUR",
  maxResults: 5,
};

describe("Amadeus flight provider", () => {
  it("authenticates, maps a live offer, and exposes limited coverage", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", expires_in: 1800 }))
      .mockResolvedValueOnce(jsonResponse(flightResponse()));
    const provider = new AmadeusFlightProvider(config, fetchMock, () => Date.parse("2026-07-22T12:00:00.000Z"));

    const result = await provider.searchFlights(query);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://test.api.amadeus.com/v1/security/oauth2/token");
    expect(String(fetchMock.mock.calls[1][0])).toContain("originLocationCode=HAM");
    expect(String(fetchMock.mock.calls[1][0])).toContain("currencyCode=EUR");
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({ Authorization: "Bearer token" });
    expect(result.coverage).toBe("provider-limited");
    expect(result.warnings).toContain(AMADEUS_COVERAGE_WARNING);
    expect(result.offers[0]).toMatchObject({
      id: "amadeus-self-service:offer-1",
      dataSource: "live",
      currencyCode: "EUR",
      totalPrice: "99.40",
      basePrice: "70.00",
      lastTicketingDate: "2026-09-01",
      totalDurationMinutes: 345,
      transfers: 1,
      validatingAirlineCodes: ["XQ"],
      bookableSeats: 4,
    });
    expect(result.offers[0].segments).toHaveLength(2);
  });

  it("reuses the OAuth token while it remains fresh", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", expires_in: 1800 }))
      .mockImplementation(async () => jsonResponse(flightResponse()));
    const provider = new AmadeusFlightProvider(config, fetchMock, () => Date.parse("2026-07-22T12:00:00.000Z"));

    await provider.searchFlights(query);
    await provider.searchFlights(query);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("oauth2/token"))).toHaveLength(1);
  });

  it("retries one transient search failure without retrying invalid requests", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", expires_in: 1800 }))
      .mockResolvedValueOnce(jsonResponse({ errors: [{ detail: "temporary" }] }, 503))
      .mockResolvedValueOnce(jsonResponse(flightResponse()));
    const provider = new AmadeusFlightProvider(config, fetchMock);

    await expect(provider.searchFlights(query)).resolves.toMatchObject({ offers: [{ sourceRecordId: "offer-1" }] });
    await expect(provider.searchFlights({ ...query, originIataCode: "Hamburg" })).rejects.toMatchObject({
      code: "invalid-request",
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects malformed upstream data rather than inventing fields", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", expires_in: 1800 }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "broken" }] }));

    await expect(new AmadeusFlightProvider(config, fetchMock).searchFlights(query)).rejects.toBeInstanceOf(LiveFlightProviderError);
  });

  it("rejects invalid date order and currency before calling Amadeus", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const provider = new AmadeusFlightProvider(config, fetchMock);

    await expect(provider.searchFlights({ ...query, returnDate: "2026-09-01" })).rejects.toMatchObject({ code: "invalid-request" });
    await expect(provider.searchFlights({ ...query, currencyCode: "eur" })).rejects.toMatchObject({ code: "invalid-request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Amadeus configuration", () => {
  it("uses demo mode explicitly without requiring credentials", () => {
    expect(configureFlightInventory({ ROUTE_DATA_MODE: "demo" })).toEqual({ mode: "demo", liveProvider: null });
  });

  it("fails closed when live mode has no server credentials", () => {
    expect(() => configureFlightInventory({ ROUTE_DATA_MODE: "live" })).toThrow("requires AMADEUS_CLIENT_ID");
  });

  it("selects the official production host only when configured", () => {
    expect(readAmadeusConfig({
      AMADEUS_CLIENT_ID: "id",
      AMADEUS_CLIENT_SECRET: "secret",
      AMADEUS_ENVIRONMENT: "production",
    }).baseUrl).toBe("https://api.amadeus.com");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function flightResponse(): unknown {
  return {
    data: [{
      type: "flight-offer",
      id: "offer-1",
      lastTicketingDate: "2026-09-01",
      numberOfBookableSeats: 4,
      validatingAirlineCodes: ["XQ"],
      price: { currency: "EUR", total: "99.40", grandTotal: "99.40", base: "70.00" },
      itineraries: [{
        duration: "PT5H45M",
        segments: [
          {
            departure: { iataCode: "HAM", terminal: "1", at: "2026-09-10T08:00:00+02:00" },
            arrival: { iataCode: "IST", at: "2026-09-10T12:10:00+03:00" },
            carrierCode: "XQ",
            number: "101",
          },
          {
            departure: { iataCode: "IST", at: "2026-09-10T13:00:00+03:00" },
            arrival: { iataCode: "AYT", terminal: "2", at: "2026-09-10T14:45:00+03:00" },
            carrierCode: "XQ",
            number: "202",
          },
        ],
      }],
    }],
  };
}
