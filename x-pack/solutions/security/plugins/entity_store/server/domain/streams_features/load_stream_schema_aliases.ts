/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';

/**
 * Closed vocabulary of ECS identity fields that schema-feature aliases may
 * target. Anything outside this set is dropped at load time with a warn log.
 *
 * Why a closed vocabulary:
 * - The static `host` / `service` / `user` engines extract entities from a
 *   fixed identity contract (host.id|host.name|host.hostname for host;
 *   service.name for service; user.{email,id,name,domain} + entity.namespace
 *   for user). An alias targeting any other field cannot land an entity, so
 *   accepting it would only create dead config.
 * - Operators reviewing LLM-emitted aliases need to know which destinations
 *   are honored without reading entity-store source. The list here is the
 *   contract.
 *
 * Adding a new ECS identity field here is a deliberate, audited change —
 * it implies the static engines' identity contract has expanded.
 */
export const ECS_IDENTITY_FIELD_SET = [
  'user.email',
  'user.id',
  'user.name',
  'user.domain',
  'host.id',
  'host.name',
  'host.hostname',
  'service.name',
  'entity.namespace',
] as const;

export type EcsIdentityField = (typeof ECS_IDENTITY_FIELD_SET)[number];

const isEcsIdentityField = (key: string): key is EcsIdentityField =>
  (ECS_IDENTITY_FIELD_SET as readonly string[]).includes(key);

/**
 * Validated alias table for one schema feature: ECS identity destination →
 * ordered list of non-ECS source paths in the stream that carry the same
 * identity. Order matters for downstream COALESCE precedence — the first
 * non-null source wins.
 */
export type AliasMap = ReadonlyMap<EcsIdentityField, readonly string[]>;

/**
 * Per-stream context the entity store needs to apply schema-feature aliases
 * during extraction. Exactly one `StreamAliasContext` per (stream, schema
 * feature) above threshold; if a stream has multiple schema features above
 * threshold (rare but possible), each one yields its own context — they do
 * NOT merge (their `filter`s and `confidence`s differ).
 */
export interface StreamAliasContext {
  /** The Streams stream the aliases apply to (e.g. `logs.azure.signinlogs`). */
  streamName: string;
  /**
   * Index patterns backing the stream, resolved via `reader.resolveIndexPatterns`.
   * Empty when the stream cannot be resolved (deleted, permission denied, …);
   * such contexts are excluded by the loader so consumers never have to
   * special-case empty patterns.
   */
  indexPatterns: string[];
  /** Validated alias table — keys are guaranteed in `ECS_IDENTITY_FIELD_SET`. */
  aliases: AliasMap;
  /** Provenance: the schema feature's UUID. Stamped on aliased entity docs. */
  featureUuid: string;
  /** Provenance: the schema feature's confidence (0–100). Stamped on aliased entity docs. */
  confidence: number;
  /**
   * Optional schema-feature filter. Applied as an additional WHERE clause on
   * the alias-scoped extraction query so aliases scoped to a specific event
   * shape (e.g. sign-in events but not audit events on the same stream) only
   * fire on docs that match. Mitigates the "one field, two semantics" risk.
   */
  filter?: Condition;
}

/**
 * Validates a raw `properties.ecs_identity_aliases` value into a typed
 * `AliasMap`. Drops keys not in the closed vocabulary, drops sources that
 * aren't strings, drops the entry entirely when no valid sources remain.
 *
 * Logs a warn line per dropped key (with stream name and key for grep) so
 * LLM-noise rates can be quantified post-rollout. Returns `undefined` when
 * the input isn't a usable object — callers must skip the feature in that
 * case.
 */
export const validateAliasTable = (
  rawTable: unknown,
  context: { streamName: string; featureUuid: string; logger: Logger }
): AliasMap | undefined => {
  if (rawTable === null || typeof rawTable !== 'object' || Array.isArray(rawTable)) {
    return undefined;
  }

  const result = new Map<EcsIdentityField, readonly string[]>();
  for (const [rawKey, rawValue] of Object.entries(rawTable)) {
    if (!isEcsIdentityField(rawKey)) {
      context.logger.warn(
        `[entity_store] Stream schema feature ${context.featureUuid} on stream ${context.streamName} declared an ecs_identity_alias for unknown destination "${rawKey}"; ignoring`
      );
      continue;
    }
    if (!Array.isArray(rawValue)) {
      context.logger.warn(
        `[entity_store] Stream schema feature ${context.featureUuid} on stream ${context.streamName} declared a non-array value for ecs_identity_alias "${rawKey}"; ignoring`
      );
      continue;
    }
    const sources = rawValue.filter(
      (source): source is string => typeof source === 'string' && source.length > 0
    );
    if (sources.length === 0) {
      continue;
    }
    result.set(rawKey, sources);
  }

  return result.size > 0 ? result : undefined;
};

const extractAliasesFromFeature = (feature: Feature): unknown => {
  if (!feature.properties || typeof feature.properties !== 'object') return undefined;
  return (feature.properties as Record<string, unknown>).ecs_identity_aliases;
};

export interface LoadStreamSchemaAliasesOptions {
  /**
   * Mirror of `StreamsKnowledgeIndicatorsListOptions.minConfidence`. When
   * `null` the loader returns an empty array WITHOUT calling the reader —
   * this is the "alias adoption disabled" branch and must short-circuit
   * before any I/O so disabled tenants pay zero cost.
   */
  minConfidence: number | null;
}

/**
 * Loads validated schema-feature aliases for the current extraction run.
 *
 * Behavior:
 * - Returns `[]` immediately when `minConfidence` is `null` (alias adoption
 *   off). This is the runtime no-op branch the config knob defaults to.
 * - Otherwise lists `type: 'schema'` features above threshold via the
 *   reader, validates each feature's `properties.ecs_identity_aliases`
 *   against the closed vocabulary, drops features with no valid aliases,
 *   and resolves index patterns once per stream.
 * - Multiple schema features per stream are returned as separate contexts;
 *   they do NOT merge because their `filter`s and `confidence`s differ.
 *
 * Caching is the caller's responsibility — `LogsExtractionClient` calls
 * this once per extraction run and reuses the result across all engine
 * passes (host, service, user) within that run.
 */
export const loadStreamSchemaAliases = async (
  reader: StreamsKnowledgeIndicatorsReader,
  options: LoadStreamSchemaAliasesOptions,
  logger: Logger
): Promise<StreamAliasContext[]> => {
  if (options.minConfidence === null) {
    return [];
  }

  const features = await reader.listSchemaFeatures({ minConfidence: options.minConfidence });
  if (features.length === 0) {
    return [];
  }

  // resolveIndexPatterns may return [] for deleted / inaccessible streams; we
  // resolve once per distinct stream name to avoid repeated I/O when a stream
  // carries multiple schema features.
  const indexPatternsByStream = new Map<string, string[]>();
  const distinctStreamNames = Array.from(new Set(features.map((f) => f.stream_name)));
  await Promise.all(
    distinctStreamNames.map(async (streamName) => {
      try {
        const patterns = await reader.resolveIndexPatterns(streamName);
        indexPatternsByStream.set(streamName, patterns);
      } catch (error) {
        logger.warn(
          `[entity_store] Failed to resolve index patterns for stream ${streamName}: ${
            error instanceof Error ? error.message : String(error)
          }; aliases for this stream will be skipped`
        );
        indexPatternsByStream.set(streamName, []);
      }
    })
  );

  const contexts: StreamAliasContext[] = [];
  for (const feature of features) {
    const indexPatterns = indexPatternsByStream.get(feature.stream_name) ?? [];
    if (indexPatterns.length === 0) {
      continue;
    }
    const aliases = validateAliasTable(extractAliasesFromFeature(feature), {
      streamName: feature.stream_name,
      featureUuid: feature.uuid,
      logger,
    });
    if (!aliases) {
      continue;
    }
    contexts.push({
      streamName: feature.stream_name,
      indexPatterns,
      aliases,
      featureUuid: feature.uuid,
      confidence: feature.confidence,
      filter: feature.filter,
    });
  }
  return contexts;
};
