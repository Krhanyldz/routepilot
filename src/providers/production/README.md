# Production provider adapters

Production adapters implement provider-independent contracts from `src/providers`.

- `travelpayouts/`: server-only worldwide city and airport reference data for autocomplete.

Real-time flight inventory is intentionally unavailable until TravelPayouts grants Flight Search API access. Cached Data API prices must not be normalized as live offers.

Provider credentials remain server-side. Production adapters must return normalized domain data and explicit typed failures; they must never substitute hardcoded demo records when an upstream service fails.
