import { buildCanonicalLocationId, createCanonicalLocation, type CanonicalLocation, type LocationSourceMetadata } from "@/domain/location";

export interface LocationDeduplicationOptions {
  sourcePrecedence: readonly string[];
}

export function deduplicateCanonicalLocations(
  locations: readonly CanonicalLocation[],
  options: LocationDeduplicationOptions,
): CanonicalLocation[] {
  const precedence = new Map(options.sourcePrecedence.map((sourceId, index) => [sourceId, index]));
  const groups = new Map<string, CanonicalLocation[]>();

  for (const location of locations) {
    const key = canonicalMatchKey(location);
    groups.set(key, [...(groups.get(key) ?? []), location]);
  }

  return [...groups.values()].map((matches) => mergeMatches(matches, precedence));
}

function mergeMatches(matches: readonly CanonicalLocation[], precedence: ReadonlyMap<string, number>): CanonicalLocation {
  const sorted = [...matches].sort((a, b) => sourceRank(a, precedence) - sourceRank(b, precedence) || a.id.localeCompare(b.id));
  const primary = sorted[0];
  const code = primary.iataCode ?? primary.stationCode ?? primary.portCode;
  const sources = uniqueSources(sorted.flatMap(({ sources: locationSources }) => locationSources));
  const aliases = [...new Set(sorted.flatMap((location) => [location.name, ...location.aliases]).filter((name) => name !== primary.name))];

  return createCanonicalLocation({
    ...primary,
    id: code
      ? buildCanonicalLocationId({ type: primary.type, countryCode: primary.countryCode, primaryCodeOrSlug: code })
      : primary.id,
    aliases,
    sources,
    lastUpdatedAt: sorted.map(({ lastUpdatedAt }) => lastUpdatedAt).sort().at(-1) ?? primary.lastUpdatedAt,
  });
}

function canonicalMatchKey(location: CanonicalLocation): string {
  const strongCode = location.iataCode ?? location.stationCode ?? location.portCode;
  if (strongCode) return `${location.type}:${location.countryCode}:${strongCode}`.toLowerCase();
  return [location.type, location.countryCode, normalize(location.city), normalize(location.name), location.latitude.toFixed(3), location.longitude.toFixed(3)].join(":");
}

function sourceRank(location: CanonicalLocation, precedence: ReadonlyMap<string, number>): number {
  return Math.min(...location.sources.map(({ sourceId }) => precedence.get(sourceId) ?? Number.MAX_SAFE_INTEGER));
}

function uniqueSources(sources: readonly LocationSourceMetadata[]): LocationSourceMetadata[] {
  return [...new Map(sources.map((source) => [`${source.sourceId}:${source.sourceRecordId}`, source])).values()];
}

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}
