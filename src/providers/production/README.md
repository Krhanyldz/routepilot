# Production provider adapters

Production adapters implement provider-independent contracts from `src/providers`.

- `travelpayouts/`: server-only worldwide city and airport reference data for autocomplete.
- `amadeus/`: server-only OAuth and live Flight Offers Search normalization.

Provider credentials remain server-side. Production adapters must return normalized domain data and explicit typed failures; they must never substitute hardcoded demo records when an upstream service fails.
