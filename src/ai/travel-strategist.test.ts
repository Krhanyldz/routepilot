import { describe, expect, it, vi } from "vitest";
import { generateAlternativeExplanations } from "./alternative-generator";
import { createConversationState } from "./conversation-state";
import { parseNaturalLanguageTravelRequest } from "./natural-language-parser";
import { buildRouteExplanationPrompt } from "./prompt-builder";
import { explainRoute } from "./route-explanation-engine";
import type { RankedRoutesEvidence, StrategistRouteEngine } from "./route-evidence";
import { AiTravelStrategist } from "./travel-strategist";
import { defaultTravelRequest } from "./travel-request";

const evidence: RankedRoutesEvidence = {
  requestId: "search-1",
  routes: [
    {
      routeId: "route-hamburg",
      categories: ["cheapest", "best-value"],
      totalPriceDisplay: "€59",
      totalDurationDisplay: "4h 55m",
      transferCount: 1,
      riskLabel: "Low risk",
      legs: [
        { from: "Bremen", to: "Hamburg", mode: "train" },
        { from: "Hamburg", to: "Antalya", mode: "flight" },
      ],
      explanationEvidence: [
        { kind: "positioning-savings", departureName: "Hamburg", savingsDisplay: "€241", deutschlandticketMakesPositioningFree: true },
        { kind: "slower-but-saves", savingsDisplay: "€180" },
      ],
      dataStatus: "demo",
    },
    {
      routeId: "route-direct",
      categories: ["fastest", "lowest-risk", "fewest-transfers"],
      totalPriceDisplay: "€300",
      totalDurationDisplay: "3h 30m",
      transferCount: 0,
      riskLabel: "Low risk",
      legs: [{ from: "Bremen", to: "Antalya", mode: "flight" }],
      explanationEvidence: [],
      dataStatus: "demo",
    },
  ],
};

describe("AI travel strategist", () => {
  it("parses a natural-language request into supported deterministic filters", () => {
    const request = parseNaturalLanguageTravelRequest(
      "From Bremen to Antalya under €100, maximum 2 transfers, within 8 hours, radius 250 km, with Deutschlandticket, allow self-transfers, cheapest",
    );

    expect(request).toMatchObject({
      origin: "Bremen",
      destination: "Antalya",
      budget: 100,
      maximumTransfers: 2,
      maximumDurationMinutes: 480,
      searchRadiusKm: 250,
      hasDeutschlandticket: true,
      selfTransferAllowed: true,
      preferredBalance: "cheapest",
    });
  });

  it("reuses conversation preferences and delegates route facts to the routing engine", async () => {
    const search = vi.fn<StrategistRouteEngine["search"]>().mockResolvedValue(evidence);
    const strategist = new AiTravelStrategist({ search });
    const initial = {
      ...createConversationState("conversation-1"),
      currentRequest: { ...defaultTravelRequest, origin: "Bremen", destination: "Antalya", hasDeutschlandticket: true },
    };

    const result = await strategist.handleMessage(initial, "Fastest, maximum 1 transfer", "turn-1");

    expect(search).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith(expect.objectContaining({
      origin: "Bremen",
      destination: "Antalya",
      hasDeutschlandticket: true,
      maximumTransfers: 1,
      preferredBalance: "fastest",
    }));
    expect(result.conversation.turns).toHaveLength(1);
    expect(result.evidence).toBe(evidence);
  });

  it("renders only precomputed explanation evidence", () => {
    expect(explainRoute(evidence.routes[0])).toEqual([
      "Hamburg departure saves €241 because Deutschlandticket makes positioning free.",
      "This route is slower but saves €180.",
    ]);
  });

  it("describes engine-assigned alternative categories without ranking", () => {
    expect(generateAlternativeExplanations(evidence)).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "cheapest", routeId: "route-hamburg" }),
      expect.objectContaining({ category: "fastest", routeId: "route-direct" }),
      expect.objectContaining({ category: "lowest-risk", routeId: "route-direct" }),
      expect.objectContaining({ category: "fewest-transfers", routeId: "route-direct" }),
      expect.objectContaining({ category: "best-value", routeId: "route-hamburg" }),
    ]));
  });

  it("builds prompts from sanitized evidence without provider payload fields", () => {
    const prompt = buildRouteExplanationPrompt(evidence);
    expect(prompt.payload).toContain('"totalPrice":"€59"');
    expect(prompt.payload).toContain('"dataStatus":"demo"');
    expect(prompt.payload).not.toContain("providerId");
    expect(prompt.payload).not.toContain("availability");
    expect(prompt.system).toContain("never calculate or infer");
  });
});
