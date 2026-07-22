import {
  ProviderBudgetConfigurationError,
  type ProviderBudget,
} from "./provider-budget";

export type ProviderBudgetGuardResult =
  | { status: "allowed" }
  | { status: "rejected"; httpStatus: 429; reason: "provider-budget-exhausted"; retryAfterSeconds: number }
  | {
    status: "unavailable";
    httpStatus: 503;
    reason: "provider-budget-misconfigured" | "provider-budget-unavailable";
  };

export async function guardProviderRequest(
  budget: ProviderBudget,
  scope: string,
): Promise<ProviderBudgetGuardResult> {
  try {
    const decision = await budget.consume(scope);
    return decision.allowed
      ? { status: "allowed" }
      : {
        status: "rejected",
        httpStatus: 429,
        reason: "provider-budget-exhausted",
        retryAfterSeconds: decision.retryAfterSeconds,
      };
  } catch (error) {
    return {
      status: "unavailable",
      httpStatus: 503,
      reason: error instanceof ProviderBudgetConfigurationError
        ? "provider-budget-misconfigured"
        : "provider-budget-unavailable",
    };
  }
}
