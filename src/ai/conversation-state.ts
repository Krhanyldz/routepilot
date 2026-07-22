import type { TravelRequest } from "./travel-request";

export interface ConversationTurn {
  id: string;
  userMessage: string;
  interpretedRequest: TravelRequest;
}

export interface TravelConversationState {
  conversationId: string;
  currentRequest: TravelRequest | null;
  turns: readonly ConversationTurn[];
}

export function createConversationState(conversationId: string): TravelConversationState {
  if (!conversationId.trim()) throw new Error("Conversation ID is required");
  return { conversationId, currentRequest: null, turns: [] };
}

export function appendConversationTurn(
  state: TravelConversationState,
  userMessage: string,
  interpretedRequest: TravelRequest,
  turnId: string,
): TravelConversationState {
  return {
    ...state,
    currentRequest: interpretedRequest,
    turns: [...state.turns, { id: turnId, userMessage, interpretedRequest }],
  };
}
