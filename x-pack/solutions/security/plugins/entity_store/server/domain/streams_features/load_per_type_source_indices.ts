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
 * - `generic`→ `entity.id` (rarely surfaced by schema features; kept for completeness).
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

/** Union of every identity field across all entity types, used to scan evidence strings. */
const ALL_IDENTITY_FIELDS: readonly string[] = Array.from(
  new Set(Object.values(ENTITY_TYPE_IDENTITY_FIELDS).flat())
);

/**
 * The set of ECS identity fields a schema feature surfaces for a stream.
 * Derived from the feature, never persisted — recomputed each run.
 */
export type EntityFieldPresence = ReadonlySet<string>;

/**
 * Derives which ECS identity fields a `schema`-class feature surfaces for its
 * stream. Three signals are combined (most authoritative first); any field
 * found by any signal counts as present:
 *
 * 1. `properties.entity_field_presence` — an explicit object the LLM may emit,
 *    keyed by entity type with arrays of identity field names. Values are
 *    intersected with the known identity vocabulary so a hallucinated field
 *    cannot qualify a stream.
 * 2. `properties.ecs_identity_aliases` — POC 3's alias table. Its KEYS are ECS
 *    identity destinations the stream can populate, so a present key means the
 *    stream carries that identity (via alias).
 * 3. `evidence` strings — deterministic fallback: any identity field name that
 *    appears verbatim as a token in an evidence string is treated as present.
 *    This is the floor that works even when the LLM emits neither structured
 *    property above.
 */
export const deriveEntityFieldPresence = (feature: Feature): EntityFieldPresence => {
  const present = new Set<string>();
  const properties =
    feature.properties && typeof feature.properties === 'object'
      ? (feature.properties as Record<string, unknown>)
      : undefined;

  // Signal 1 — explicit entity_field_presence object.
  const rawPresence = properties?.entity_field_presence;
  if (rawPresence && typeof rawPresence === 'object' && !Array.isArray(rawPresence)) {
    for (const value of Object.values(rawPresence as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      for (const field of value) {
        if (typeof field === 'string' && ALL_IDENTITY_FIELDS.includes(field)) {
          present.add(field);
        }
      }
    }
  }

  // Signal 2 — ecs_identity_aliases keys (alias destinations the stream populates).
  const rawAliases = properties?.ecs_identity_aliases;
  if (rawAliases && typeof rawAliases === 'object' && !Array.isArray(rawAliases)) {
    for (const key of Object.keys(rawAliases as Record<string, unknown>)) {
      if (ALL_IDENTITY_FIELDS.includes(key)) {
        present.add(key);
      }
    }
  }

  // Signal 3 — evidence-string scan (deterministic fallback).
  if (Array.isArray(feature.evidence)) {
    for (const line of feature.evidence) {
      if (typeof line !== 'string') continue;
      for (const field of ALL_IDENTITY_FIELDS) {
        if (line.includes(field)) {
          present.add(field);
        }
      }
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

export interface LoadPerTypeSourceIndicesOptions {
  /**
   * Confidence floor pushed into the schema-feature query. When `null` the
   * loader short-circuits and returns empty sources WITHOUT any I/O — the
   * "auto-discovery disabled" branch the config flag defaults to.
   */
  minConfidence: number | null;
}

const emptySources = (): PerTypeSourceIndices => ({
  user: [],
  host: [],
  service: [],
  generic: [],
});

/**
 * Loads the per-entity-type extraction source index patterns for the current
 * run, derived automatically from whatever `schema`-class Knowledge Indicators
 * exist. There is no operator registry/toggle: every qualifying stream is
 * included for every type its identity fields satisfy.
 *
 * Behavior:
 * - `minConfidence === null` → returns empty sources, no I/O (disabled branch).
 * - Otherwise lists schema features above threshold, resolves index patterns
 *   once per distinct stream, derives identity-field presence per feature, and
 *   assigns the stream's patterns to each entity type whose identity fields
 *   intersect that presence.
 * - Patterns are deduped per type. Streams that resolve to no index patterns
 *   (deleted / inaccessible) are skipped.
 *
 * Caching is the caller's responsibility — `LogsExtractionClient` calls this
 * once per extraction run and reuses the result across engine passes.
 */
export const loadPerTypeSourceIndices = async (
  reader: StreamsKnowledgeIndicatorsReader,
  options: LoadPerTypeSourceIndicesOptions,
  logger: Logger
): Promise<{ sources: PerTypeSourceIndices; provenance: PerTypeSourceProvenance[] }> => {
  if (options.minConfidence === null) {
    return { sources: emptySources(), provenance: [] };
  }

  const features = await reader.listSchemaFeatures({ minConfidence: options.minConfidence });
  if (features.length === 0) {
    return { sources: emptySources(), provenance: [] };
  }

  // Resolve once per distinct stream — a stream may carry multiple schema features.
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
    const presence = deriveEntityFieldPresence(feature);
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
