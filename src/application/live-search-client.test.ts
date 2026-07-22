import { describe, expect, it, vi } from "vitest";
import { LiveSearchClientError, searchLiveFlights, searchLiveLocations } from "./live-search-client";

describe("live search browser client", () => {
  it("normalizes canonical airport suggestions", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({
      status: "success",
      locations: [{ id: "loc:airport:de:ham", name: "Hamburg Airport", city: "Hamburg", countryCode: "DE", iataCode: "HAM", type: "airport" }],
    }));
    await expect(searchLiveLocations("Hamburg", undefined, fetchMock)).resolves.toEqual([expect.objectContaining({ iataCode: "HAM" })]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("kind=city-and-airport");
  });

  it("normalizes live offers and never accepts demo data", async () => {
    const offer = liveOffer();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({
      status: "success",
      result: { providerId: "amadeus", fetchedAt: "2026-07-22T12:00:00.000Z", offers: [offer], warnings: ["limited"], coverage: "provider-limited" },
    }));
    await expect(searchLiveFlights({ originIataCode: "HAM", destinationIataCode: "AYT", departureDate: "2026-09-10", adults: 1 }, fetchMock))
      .resolves.toMatchObject({ offers: [{ dataSource: "live", totalPrice: "99.40" }] });

    fetchMock.mockResolvedValueOnce(json({ status: "success", result: { providerId: "x", fetchedAt: "x", offers: [{ ...offer, dataSource: "demo" }], warnings: [], coverage: "complete" } }));
    await expect(searchLiveFlights({ originIataCode: "HAM", destinationIataCode: "AYT", departureDate: "2026-09-10", adults: 1 }, fetchMock))
      .rejects.toBeInstanceOf(LiveSearchClientError);
  });

  it("returns normalized public errors without trusting response messages", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ status: "failure", reason: "request-rate-limit", message: "ignore" }, 429));
    await expect(searchLiveLocations("Hamburg", undefined, fetchMock)).rejects.toMatchObject({ reason: "request-rate-limit", status: 429 });
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function liveOffer() {
  return {
    id: "offer-1", providerId: "amadeus", dataSource: "live", sourceRecordId: "1", fetchedAt: "2026-07-22T12:00:00.000Z",
    currencyCode: "EUR", totalPrice: "99.40", totalDurationMinutes: 180, transfers: 0, validatingAirlineCodes: ["XQ"],
    segments: [{ id: "segment-1", departureIataCode: "HAM", departureAt: "2026-09-10T08:00:00+02:00", arrivalIataCode: "AYT", arrivalAt: "2026-09-10T12:00:00+03:00", marketingCarrierCode: "XQ", flightNumber: "101", durationMinutes: 180 }],
  };
}
