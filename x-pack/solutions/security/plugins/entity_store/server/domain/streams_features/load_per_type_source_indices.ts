/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import type { EntityType } from '../../../common/domain/definitions/entity_schema';

/**
 * Identity source fields per entity type — the fields whose presence in a
 * stream qualifies that stream as a source for the corresponding engine.
 *
 * These mirror each static engine's identity contract as expressed in the
 * entity definitions under `common/domain/definitions/`:
 * - `user`   → `euidRanking` / `documentsFilter` key off `user.{email,id,name,domain}`.
 * - `host`   → `host.{id,name,hostname}`.
 * - `service`→ `service.name`.
 * - `generic`→ `entity.id` (rarely surfaced by dataset_analysis; kept for completeness).
 *
 * Keeping this list here (rather than deriving it from the `euidRanking`
 * branches at runtime) is deliberate: the ranking branches encode precedence
 * and composition rules that are irrelevant to "does this stream carry any of
 * this engine's identity fields?". Expanding an engine's identity contract is
 * an audited change that should update this constant in lockstep.
 */
export const ENTITY_TYPE_IDENTITY_FIELDS = {
  user: ['user.email', 'user.id', 'user.name', 'user.domain'],
  host: ['host.id', 'host.name', 'host.hostname'],
  service: ['service.name'],
  generic: ['entity.id'],
} as const satisfies Record<EntityType, readonly string[]>;

const ENTITY_TYPES = Object.keys(ENTITY_TYPE_IDENTITY_FIELDS) as EntityType[];

/** Union of every identity field across all entity types. */
const ALL_IDENTITY_FIELDS: readonly string[] = Array.from(
  new Set(Object.values(ENTITY_TYPE_IDENTITY_FIELDS).flat())
);

/**
 * The set of ECS identity fields a `dataset_analysis` feature surfaces for a
 * stream at a safe ES type. Derived from the feature, never persisted —
 * recomputed each run.
 */
export type EntityFieldPresence = ReadonlySet<string>;

/**
 * ES field types accepted as identity sources. `keyword` is exact-match and
 * aggregatable, so it is safe to extract/group on; `text` / `match_only_text`
 * and unmapped fields are intentionally excluded. Centralized so the safe set
 * can be widened later (e.g. `ip`, `boolean`) without touching call sites.
 */
const SAFE_IDENTITY_FIELD_TYPES = new Set<string>(['keyword']);

/**
 * Parses a `dataset_analysis` field key into its field name and ES type list.
 *
 * Keys are produced by `formatDocumentAnalysis`'s `getFieldKey`:
 * - `"user.email (keyword)"`   → `{ name: 'user.email', types: ['keyword'] }`
 * - `"x (text, keyword)"`      → `{ name: 'x', types: ['text', 'keyword'] }`
 * - `"y (unmapped - no type)"` → `{ name: 'y', types: [] }`
 *
 * A key that does not match the `"<name> (<inner>)"` shape is treated as a
 * bare field name with no known type (and therefore cannot qualify).
 */
const parseDatasetAnalysisFieldKey = (key: string): { name: string; types: string[] } => {
  const match = key.match(/^(.*)\s\(([^)]*)\)$/);
  if (!match) {
    return { name: key, types: [] };
  }
  const [, name, inner] = match;
  if (inner === 'unmapped - no type') {
    return { name, types: [] };
  }
  return { name, types: inner.split(',').map((type) => type.trim()) };
};

/**
 * Derives which ECS identity fields a `dataset_analysis` feature surfaces for
 * its stream. The computed feature exposes `properties.analysis.fields`, an
 * object keyed by `"<field.path> (<es_types>)"`. A field qualifies only when
 * its name is a known identity field AND it is mapped at a safe type
 * (`SAFE_IDENTITY_FIELD_TYPES`), so unsafe `text` / unmapped fields never
 * promote a stream to a source.
 */
export const deriveEntityFieldPresenceFromDatasetAnalysis = (
  feature: Feature
): EntityFieldPresence => {
  const present = new Set<string>();
  const analysis = (feature.properties as Record<string, unknown> | undefined)?.analysis;
  const fields =
    analysis && typeof analysis === 'object'
      ? (analysis as Record<string, unknown>).fields
      : undefined;
  if (!fields || typeof fields !== 'object') {
    return present;
  }
  for (const key of Object.keys(fields as Record<string, unknown>)) {
    const { name, types } = parseDatasetAnalysisFieldKey(key);
    if (
      ALL_IDENTITY_FIELDS.includes(name) &&
      types.some((type) => SAFE_IDENTITY_FIELD_TYPES.has(type))
    ) {
      present.add(name);
    }
  }
  return present;
};

/** Per-type resolved index patterns. One array per entity type; deduped, order-stable. */
export type PerTypeSourceIndices = Record<EntityType, string[]>;

/** Provenance for the visibility surface: which stream/feature qualified for which type, and why. */
export interface PerTypeSourceProvenance {
  entityType: EntityType;
  streamName: string;
  indexPatterns: string[];
  featureUuid: string;
  confidence: number;
  /** The identity fields that caused this stream to qualify for `entityType`. */
  matchedFields: string[];
}

const emptySources = (): PerTypeSourceIndices => ({
  user: [],
  host: [],
  service: [],
  generic: [],
});

/**
 * Loads the per-entity-type extraction source index patterns for the current
 * run, derived automatically from the deterministic `dataset_analysis`
 * Knowledge Indicators that exist. There is no operator registry/toggle: every
 * qualifying stream is included for every type its identity fields satisfy.
 *
 * Behavior:
 * - Lists `dataset_analysis` features, resolves index patterns once per
 *   distinct stream, derives identity-field presence per feature (keyword-typed
 *   identity fields only), and assigns the stream's patterns to each entity
 *   type whose identity fields intersect that presence.
 * - Patterns are deduped per type. Streams that resolve to no index patterns
 *   (deleted / inaccessible) are skipped.
 *
 * Enable/disable gating lives in the callers (they skip this entirely when
 * `useDiscoveredIndexSource` is off), so there is no disabled short-circuit
 * here. Caching is the caller's responsibility — `LogsExtractionClient` calls
 * this once per extraction run and reuses the result across engine passes.
 */
export const loadPerTypeSourceIndices = async (
  reader: StreamsKnowledgeIndicatorsReader,
  logger: Logger
): Promise<{ sources: PerTypeSourceIndices; provenance: PerTypeSourceProvenance[] }> => {
  const features = await reader.listDatasetAnalysisFeatures();
  if (features.length === 0) {
    return { sources: emptySources(), provenance: [] };
  }

  // Resolve once per distinct stream — dataset_analysis emits one feature per
  // stream, but dedupe defensively in case of overlap.
  const indexPatternsByStream = new Map<string, string[]>();
  const distinctStreamNames = Array.from(new Set(features.map((feature) => feature.stream_name)));
  await Promise.all(
    distinctStreamNames.map(async (streamName) => {
      try {
        indexPatternsByStream.set(streamName, await reader.resolveIndexPatterns(streamName));
      } catch (error) {
        logger.warn(
          `[entity_store] Failed to resolve index patterns for stream ${streamName}: ${
            error instanceof Error ? error.message : String(error)
          }; this stream will be skipped for source discovery`
        );
        indexPatternsByStream.set(streamName, []);
      }
    })
  );

  const sourceSets: Record<EntityType, Set<string>> = {
    user: new Set(),
    host: new Set(),
    service: new Set(),
    generic: new Set(),
  };
  const provenance: PerTypeSourceProvenance[] = [];

  for (const feature of features) {
    const indexPatterns = indexPatternsByStream.get(feature.stream_name) ?? [];
    if (indexPatterns.length === 0) {
      continue;
    }
    const presence = deriveEntityFieldPresenceFromDatasetAnalysis(feature);
    if (presence.size === 0) {
      continue;
    }

    for (const entityType of ENTITY_TYPES) {
      const matchedFields = ENTITY_TYPE_IDENTITY_FIELDS[entityType].filter((field) =>
        presence.has(field)
      );
      if (matchedFields.length === 0) {
        continue;
      }
      for (const pattern of indexPatterns) {
        sourceSets[entityType].add(pattern);
      }
      provenance.push({
        entityType,
        streamName: feature.stream_name,
        indexPatterns,
        featureUuid: feature.uuid,
        confidence: feature.confidence,
        matchedFields,
      });
    }
  }

  return {
    sources: {
      user: Array.from(sourceSets.user),
      host: Array.from(sourceSets.host),
      service: Array.from(sourceSets.service),
      generic: Array.from(sourceSets.generic),
    },
    provenance,
  };
};
