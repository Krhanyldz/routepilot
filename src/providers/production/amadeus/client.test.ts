import { describe, expect, it, vi } from "vitest";
import { AmadeusApiClient } from "./client";

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  environment: "test" as const,
  baseUrl: "https://test.api.amadeus.com",
  timeoutMs: 1_000,
  maxRetries: 0,
};

describe("Amadeus API client request coalescing", () => {
  it("shares token refresh and identical concurrent reads", async () => {
    let releaseSearch: (() => void) | undefined;
    const searchGate = new Promise<void>((resolve) => { releaseSearch = resolve; });
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes("oauth2/token")) {
        return jsonResponse({ access_token: "token", expires_in: 1_800 });
      }
      await searchGate;
      return jsonResponse({ data: [{ id: "offer-1" }] });
    });
    const client = new AmadeusApiClient(config, fetchMock);
    const params = new URLSearchParams({ originLocationCode: "HAM", destinationLocationCode: "AYT" });

    const first = client.get("/v2/shopping/flight-offers", params);
    const second = client.get("/v2/shopping/flight-offers", params);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    releaseSearch?.();

    await expect(Promise.all([first, second])).resolves.toEqual([
      { data: [{ id: "offer-1" }] },
      { data: [{ id: "offer-1" }] },
    ]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("oauth2/token"))).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("flight-offers"))).toHaveLength(1);
  });

  it("does not retain completed reads as a response cache", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", expires_in: 1_800 }))
      .mockImplementation(async () => jsonResponse({ data: [] }));
    const client = new AmadeusApiClient(config, fetchMock);
    const params = new URLSearchParams({ keyword: "Hamburg" });

    await client.get("/v1/reference-data/locations", params);
    await client.get("/v1/reference-data/locations", params);

    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("reference-data"))).toHaveLength(2);
  });

  it("clears failed token refreshes so a later request can recover", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error_description: "temporary" }, 503))
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", expires_in: 1_800 }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    const client = new AmadeusApiClient(config, fetchMock);

    await expect(client.get("/v1/reference-data/locations", new URLSearchParams({ keyword: "Ham" })))
      .rejects.toMatchObject({ code: "upstream" });
    await expect(client.get("/v1/reference-data/locations", new URLSearchParams({ keyword: "Ham" })))
      .resolves.toEqual({ data: [] });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("oauth2/token"))).toHaveLength(2);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
