import { generateAlternativeExplanations, type RouteAlternativeExplanation } from "./alternative-generator";
import { appendConversationTurn, type TravelConversationState } from "./conversation-state";
import { parseNaturalLanguageTravelRequest } from "./natural-language-parser";
import { buildRouteExplanationPrompt, type ExplanationPrompt } from "./prompt-builder";
import { explainRoute } from "./route-explanation-engine";
import type { RankedRoutesEvidence, StrategistRouteEngine } from "./route-evidence";
import { defaultTravelRequest, validateTravelRequest, type TravelRequest } from "./travel-request";

export interface TravelStrategistResult {
  request: TravelRequest;
  evidence: RankedRoutesEvidence;
  routeExplanations: Readonly<Record<string, readonly string[]>>;
  alternatives: readonly RouteAlternativeExplanation[];
  explanationPrompt: ExplanationPrompt;
  conversation: TravelConversationState;
}

export class AiTravelStrategist {
  constructor(private readonly routeEngine: StrategistRouteEngine) {}

  async handleMessage(state: TravelConversationState, message: string, turnId: string): Promise<TravelStrategistResult> {
    const request = validateTravelRequest(parseNaturalLanguageTravelRequest(message, state.currentRequest ?? defaultTravelRequest));
    const evidence = await this.routeEngine.search(request);
    const routeExplanations = Object.fromEntries(evidence.routes.map((route) => [route.routeId, explainRoute(route)]));

    return {
      request,
      evidence,
      routeExplanations,
      alternatives: generateAlternativeExplanations(evidence),
      explanationPrompt: buildRouteExplanationPrompt(evidence),
      conversation: appendConversationTurn(state, message, request, turnId),
    };
  }
}
