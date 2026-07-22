import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/locations/search?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("query")?.toUpperCase() ?? "";
    const destination = query.startsWith("TOK");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        locations: [destination
          ? { id: "loc:city:jp:tyo", name: "Tokyo", city: "Tokyo", countryCode: "JP", iataCode: "TYO", type: "city" }
          : { id: "loc:city:gb:lon", name: "London", city: "London", countryCode: "GB", iataCode: "LON", type: "city" }],
      }),
    });
  });
});

test("selects canonical airports and renders a verified live offer", async ({ page }) => {
  let submittedBody: unknown;
  await page.route("**/api/flights/search", async (route) => {
    submittedBody = route.request().postDataJSON();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(liveResponse()) });
  });

  const response = await page.goto("/");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["strict-transport-security"]).toBe("max-age=31536000");
  expect(response?.headers()["content-security-policy"]).toContain("object-src 'none'");
  await chooseAirport(page, "Origin", "London");
  await chooseAirport(page, "Destination", "Tokyo");
  await page.getByLabel("Departure").fill("2026-09-10");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByText("1 flight offer")).toBeVisible();
  await expect(page.getByText("EUR 99.40")).toBeVisible();
  await expect(page.getByText("Limited provider coverage")).toBeVisible();
  await expect(page.getByText(/booking not sold by RoutePilot/i)).toBeVisible();
  expect(submittedBody).toMatchObject({ originIataCode: "LON", destinationIataCode: "TYO", adults: 1 });
});

test("shows a safe message when live flight capability is unavailable", async ({ page }) => {
  await page.route("**/api/flights/search", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ status: "unavailable", reason: "provider-capability-unavailable", message: "private detail" }),
  }));
  await page.goto("/");
  await chooseAirport(page, "Origin", "London");
  await chooseAirport(page, "Destination", "Tokyo");
  await page.getByLabel("Departure").fill("2026-09-10");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Live flight results are not available" }),
  ).toContainText("TravelPayouts Flight Search API access");
  await expect(page.getByText("private detail")).toHaveCount(0);
});

async function chooseAirport(page: Page, label: string, query: string): Promise<void> {
  const input = page.getByRole("combobox", { name: label });
  await input.fill(query);
  await expect(page.getByRole("listbox").getByRole("option")).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
}

function liveResponse() {
  return {
    status: "success",
    result: {
      providerId: "contract-test-provider",
      fetchedAt: "2026-07-22T12:00:00.000Z",
      warnings: ["Limited provider coverage"],
      coverage: "provider-limited",
      offers: [{
        id: "offer-1", providerId: "contract-test-provider", dataSource: "live", sourceRecordId: "1",
        fetchedAt: "2026-07-22T12:00:00.000Z", currencyCode: "EUR", totalPrice: "99.40",
        totalDurationMinutes: 180, transfers: 0, validatingAirlineCodes: ["XQ"],
        segments: [{ id: "segment-1", departureIataCode: "HAM", departureAt: "2026-09-10T08:00:00+02:00", arrivalIataCode: "AYT", arrivalAt: "2026-09-10T12:00:00+03:00", marketingCarrierCode: "XQ", flightNumber: "101", durationMinutes: 180 }],
      }],
    },
  };
}
