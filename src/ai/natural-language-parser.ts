import { TRANSPORT_MODES, type TransportMode } from "@/domain/models";
import { defaultTravelRequest, type PreferredBalance, type TravelRequest } from "./travel-request";

const modeTerms: Readonly<Record<TransportMode, RegExp>> = {
  flight: /\b(?:flight|flights|flying|plane)\b/i,
  train: /\b(?:train|trains|rail)\b/i,
  ferry: /\b(?:ferry|ferries)\b/i,
};

/** Deterministic intent extraction. Unknown text is retained nowhere and never becomes route data. */
export function parseNaturalLanguageTravelRequest(
  input: string,
  previous: TravelRequest = defaultTravelRequest,
): TravelRequest {
  const route = input.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?=\s+(?:with|under|within|max|maximum|avoiding?|prefer|by|and|using|no|nearby|without)\b|[,.]|$)/i);
  const budget = input.match(/(?:budget(?:\s+of)?|under|max(?:imum)?)\s*€?\s*(\d+(?:\.\d{1,2})?)/i);
  const transfers = input.match(/(?:max(?:imum)?|up to|no more than)\s+(\d+)\s+transfers?/i);
  const duration = input.match(/(?:within|max(?:imum)?(?: duration)?|under)\s+(\d+)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i);
  const radius = input.match(/(?:radius|within)\s+(50|100|150|250)\s*km\b/i);
  const departureFlexibility = input.match(/(?:departure|outbound)?\s*flexible(?:\s+by)?\s*(?:±|\+\/-)?\s*(\d+)\s*days?/i);
  const returnFlexibility = input.match(/return\s+flexible(?:\s+by)?\s*(?:±|\+\/-)?\s*(\d+)\s*days?/i);
  const avoidedModes = TRANSPORT_MODES.filter((mode) => new RegExp(`(?:avoid|avoiding|no|without)\\s+(?:\\w+\\s+){0,2}${modeTerms[mode].source}`, "i").test(input));
  const mentionedModes = TRANSPORT_MODES.filter((mode) => modeTerms[mode].test(input) && !avoidedModes.includes(mode));

  return {
    ...previous,
    ...(route ? { origin: route[1].trim(), destination: route[2].trim() } : {}),
    ...(budget ? { budget: Number(budget[1]) } : {}),
    ...(transfers ? { maximumTransfers: Number(transfers[1]) } : {}),
    ...(duration ? { maximumDurationMinutes: toMinutes(Number(duration[1]), duration[2]) } : {}),
    ...(radius ? { searchRadiusKm: Number(radius[1]) as TravelRequest["searchRadiusKm"] } : {}),
    ...(departureFlexibility ? { departureFlexibilityDays: Number(departureFlexibility[1]) } : {}),
    ...(returnFlexibility ? { returnFlexibilityDays: Number(returnFlexibility[1]) } : {}),
    ...(mentionedModes.length > 0 ? { preferredTransportModes: mentionedModes } : {}),
    ...(avoidedModes.length > 0 ? {
      avoidTransportModes: avoidedModes,
      preferredTransportModes: previous.preferredTransportModes.filter((mode) => !avoidedModes.includes(mode)),
    } : {}),
    ...(hasAny(input, /\b(?:deutschlandticket|germany ticket)\b/i) ? { hasDeutschlandticket: !hasAny(input, /\b(?:no|without)\s+(?:a\s+)?(?:deutschlandticket|germany ticket)\b/i) } : {}),
    ...(hasAny(input, /\b(?:allow|accept|okay with)\s+self[- ]transfers?\b/i) ? { selfTransferAllowed: true } : {}),
    ...(hasAny(input, /\b(?:avoid|no|without)\s+self[- ]transfers?\b/i) ? { selfTransferAllowed: false } : {}),
    ...(hasAny(input, /\b(?:disable|no|without)\s+nearby departures?\b/i) ? { nearbyDepartureEnabled: false } : {}),
    ...(hasAny(input, /\b(?:enable|include|use)\s+nearby departures?\b/i) ? { nearbyDepartureEnabled: true } : {}),
    preferredBalance: parseBalance(input) ?? previous.preferredBalance,
  };
}

function parseBalance(input: string): PreferredBalance | undefined {
  if (/\b(?:cheapest|lowest price)\b/i.test(input)) return "cheapest";
  if (/\b(?:fastest|quickest)\b/i.test(input)) return "fastest";
  if (/\b(?:smartest|best value|balanced)\b/i.test(input)) return "smartest";
  return undefined;
}

function toMinutes(value: number, unit: string): number {
  return /^(?:h|hr|hour)/i.test(unit) ? value * 60 : value;
}

function hasAny(input: string, expression: RegExp): boolean {
  return expression.test(input);
}
