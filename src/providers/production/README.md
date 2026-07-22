# Production provider adapters

Production adapters belong in mode- or data-specific subdirectories here and must implement provider-independent contracts from `src/providers`.

The Amadeus adapter foundation under `amadeus/` implements server-side OAuth and Flight Offers Search normalization. It remains disabled unless live mode and credentials are explicitly configured, and it is not connected to the current UI search flow.

No production location adapter is connected yet. Demo location fixtures and behavior remain isolated under `src/providers/demo/location-engine` and must never be presented as live data.
