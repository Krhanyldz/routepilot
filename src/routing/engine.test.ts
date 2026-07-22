import { describe, expect, it } from "vitest";
import { getDemoComparison } from "@/application/demo-search";
import { findCheapestRoute } from "./engine";

describe("route engine", () => {
  it("recommends Hamburg for Antalya with a Deutschlandticket", () => {
    const result = getDemoComparison("Antalya", { hasDeutschlandticket: true });
    expect(result.recommended?.totalCost).toBe(59);
    expect(result.recommended?.legs.map((leg) => leg.to)).toEqual(["Hamburg", "Antalya"]);
    expect(result.explanation).toContain("saves €241");
  });

  it("still recommends Hamburg without a Deutschlandticket", () => {
    const result = getDemoComparison("Antalya", { hasDeutschlandticket: false });
    expect(result.recommended?.totalCost).toBe(79);
    expect(result.explanation).toContain("saves €221");
  });

  it("chooses the train for the final Baotou leg", () => {
    const result = getDemoComparison("Baotou", { hasDeutschlandticket: true });
    expect(result.recommended?.totalCost).toBe(329);
    expect(result.recommended?.legs.map((leg) => leg.mode)).toEqual(["train", "flight", "flight", "train"]);
    expect(result.alternatives[0].totalCost).toBe(364);
  });

  it("returns null when a destination cannot be reached", () => {
    expect(findCheapestRoute([], "Bremen", "Nowhere", { hasDeutschlandticket: true })).toBeNull();
  });
});
