import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/locations/search?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("query")?.toUpperCase() ?? "";
    const destination = query.startsWith("ANT");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        locations: [destination
          ? { id: "loc:airport:tr:ayt", name: "Antalya Airport", city: "Antalya", countryCode: "TR", iataCode: "AYT", type: "airport" }
          : { id: "loc:airport:de:ham", name: "Hamburg Airport", city: "Hamburg", countryCode: "DE", iataCode: "HAM", type: "airport" }],
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
  await chooseAirport(page, "Origin", "Hamburg");
  await chooseAirport(page, "Destination", "Antalya");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByText("1 flight offer")).toBeVisible();
  await expect(page.getByText("EUR 99.40")).toBeVisible();
  await expect(page.getByText("Limited provider coverage")).toBeVisible();
  await expect(page.getByText(/booking not sold by RoutePilot/i)).toBeVisible();
  expect(submittedBody).toMatchObject({ originIataCode: "HAM", destinationIataCode: "AYT", adults: 1 });
});

test("shows a safe message when the provider budget is exhausted", async ({ page }) => {
  await page.route("**/api/flights/search", (route) => route.fulfill({
    status: 429,
    contentType: "application/json",
    body: JSON.stringify({ status: "failure", reason: "request-rate-limit", message: "private detail" }),
  }));
  await page.goto("/");
  await chooseAirport(page, "Origin", "Hamburg");
  await chooseAirport(page, "Destination", "Antalya");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByRole("alert")).toHaveText("Too many searches. Please wait a moment and try again.");
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
      providerId: "amadeus-self-service",
      fetchedAt: "2026-07-22T12:00:00.000Z",
      warnings: ["Limited provider coverage"],
      coverage: "provider-limited",
      offers: [{
        id: "offer-1", providerId: "amadeus-self-service", dataSource: "live", sourceRecordId: "1",
        fetchedAt: "2026-07-22T12:00:00.000Z", currencyCode: "EUR", totalPrice: "99.40",
        totalDurationMinutes: 180, transfers: 0, validatingAirlineCodes: ["XQ"],
        segments: [{ id: "segment-1", departureIataCode: "HAM", departureAt: "2026-09-10T08:00:00+02:00", arrivalIataCode: "AYT", arrivalAt: "2026-09-10T12:00:00+03:00", marketingCarrierCode: "XQ", flightNumber: "101", durationMinutes: 180 }],
      }],
    },
  };
}
