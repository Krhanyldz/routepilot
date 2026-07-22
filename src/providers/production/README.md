# Production provider adapters

Production adapters belong in mode- or data-specific subdirectories here and must implement provider-independent contracts from `src/providers`.

No production location adapter or real external API is connected yet. Demo location fixtures and behavior remain isolated under `src/providers/demo/location-engine` and must never be presented as live data.
