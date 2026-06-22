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
 * Closed vocabulary of graph-role destinations a schema-feature
 * `ecs_identity_aliases` table may target for the cloud-security graph. This
 * is the graph analog of entity extraction's `ECS_IDENTITY_FIELD_SET`, widened
 * with the `.target.*` mirror and `event.action` so non-ECS streams can supply
 * the graph's three roles:
 *
 * - actor identity   → `user.*`, `host.*`, `service.name`, `entity.id`
 * - target identity  → the `.target.*` mirror of the actor set
 * - edge action/verb → `event.action`
 *
 * Anything outside this set is dropped at load time with a warn log. The graph
 * route re-validates every destination against the live
 * `GRAPH_ACTOR_EUID_SOURCE_FIELDS` / `GRAPH_TARGET_EUID_SOURCE_FIELDS` before
 * interpolating it into ES|QL (defense in depth against ES|QL injection), so
 * this set is the cross-plugin contract, not the sole guard.
 *
 * Adding a destination here is a deliberate, audited change — it implies the
 * graph's actor/target resolution reads a new ECS field.
 */
export const GRAPH_ROLE_DESTINATION_SET = [
  // actor identity
  'user.email',
  'user.id',
  'user.name',
  'user.domain',
  'host.id',
  'host.name',
  'host.hostname',
  'service.name',
  'entity.id',
  // target identity (.target.* mirror of the actor set)
  'user.target.email',
  'user.target.id',
  'user.target.name',
  'user.target.domain',
  'host.target.id',
  'host.target.name',
  'host.target.hostname',
  'service.target.name',
  'entity.target.id',
  // edge action / verb
  'event.action',
] as const;

export type GraphRoleDestination = (typeof GRAPH_ROLE_DESTINATION_SET)[number];

const isGraphRoleDestination = (key: string): key is GraphRoleDestination =>
  (GRAPH_ROLE_DESTINATION_SET as readonly string[]).includes(key);

/**
 * Validated alias table for one schema feature: graph-role destination →
 * ordered list of non-ECS source paths in the stream that carry the same
 * role. Order matters for downstream COALESCE precedence — the first non-null
 * source wins.
 */
export type GraphAliasMap = ReadonlyMap<GraphRoleDestination, readonly string[]>;

/**
 * Per-stream context the graph needs to apply schema-feature aliases at
 * request time. Exactly one `GraphRoleAliasContext` per (stream, schema
 * feature) above threshold; if a stream has multiple schema features above
 * threshold, each one yields its own context — they do NOT merge (their
 * `filter`s and `confidence`s differ).
 */
export interface GraphRoleAliasContext {
  /** The Streams stream the aliases apply to (e.g. `logs.azure.signinlogs`). */
  streamName: string;
  /**
   * Index patterns backing the stream, resolved via `reader.resolveIndexPatterns`.
   * Empty when the stream cannot be resolved (deleted, permission denied, …);
   * such contexts are excluded by the loader so consumers never have to
   * special-case empty patterns.
   */
  indexPatterns: string[];
  /**
   * Validated alias table — keys are guaranteed in `GRAPH_ROLE_DESTINATION_SET`
   * (actor identity, `.target.*` mirror, or `event.action`).
   */
  aliases: GraphAliasMap;
  /** Provenance: the schema feature's UUID. Surfaced on inferred graph nodes/edges. */
  featureUuid: string;
  /** Provenance: the schema feature's confidence (0–100). Surfaced on inferred graph nodes/edges. */
  confidence: number;
  /**
   * Optional schema-feature filter. The graph applies it as an extra guard on
   * the alias prelude (alongside the `data_stream.dataset` / `_index` guard) so
   * aliases scoped to a specific event shape (e.g. sign-in events but not audit
   * events on the same stream) only fire on docs that match. Mitigates the
   * "one field, two semantics" risk.
   */
  filter?: Condition;
}

/**
 * Validates a raw `properties.ecs_identity_aliases` value into a typed
 * `GraphAliasMap`. Drops keys not in the closed graph vocabulary, drops
 * sources that aren't non-empty strings, drops the entry entirely when no
 * valid sources remain.
 *
 * Logs a warn line per dropped key (with stream name and key for grep) so
 * LLM-noise rates can be quantified post-rollout. Returns `undefined` when the
 * input isn't a usable object — callers must skip the feature in that case.
 */
export const validateGraphAliasTable = (
  rawTable: unknown,
  context: { streamName: string; featureUuid: string; logger: Logger }
): GraphAliasMap | undefined => {
  if (rawTable === null || typeof rawTable !== 'object' || Array.isArray(rawTable)) {
    return undefined;
  }

  const result = new Map<GraphRoleDestination, readonly string[]>();
  for (const [rawKey, rawValue] of Object.entries(rawTable)) {
    if (!isGraphRoleDestination(rawKey)) {
      context.logger.warn(
        `[entity_store] Stream schema feature ${context.featureUuid} on stream ${context.streamName} declared a graph alias for unknown destination "${rawKey}"; ignoring`
      );
      continue;
    }
    if (!Array.isArray(rawValue)) {
      context.logger.warn(
        `[entity_store] Stream schema feature ${context.featureUuid} on stream ${context.streamName} declared a non-array value for graph alias "${rawKey}"; ignoring`
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

export interface LoadGraphRoleAliasesOptions {
  /**
   * Mirror of `StreamsKnowledgeIndicatorsListOptions.minConfidence` (the
   * graph's `graphAliasMinConfidence` knob). When `null` the loader returns an
   * empty array WITHOUT calling the reader — this is the "graph alias adoption
   * disabled" branch and must short-circuit before any I/O so disabled tenants
   * pay zero cost and the graph stays byte-identical to today.
   */
  minConfidence: number | null;
}

/**
 * Loads validated schema-feature graph-role aliases for the current request.
 *
 * Behavior:
 * - Returns `[]` immediately when `minConfidence` is `null` (graph alias
 *   adoption off). This is the runtime no-op branch the config knob defaults to.
 * - Otherwise lists `type: 'schema'` features above threshold via the reader,
 *   validates each feature's `properties.ecs_identity_aliases` against the
 *   closed graph vocabulary, drops features with no valid aliases, and resolves
 *   index patterns once per stream.
 * - Multiple schema features per stream are returned as separate contexts; they
 *   do NOT merge because their `filter`s and `confidence`s differ.
 */
export const loadGraphRoleAliases = async (
  reader: StreamsKnowledgeIndicatorsReader,
  options: LoadGraphRoleAliasesOptions,
  logger: Logger
): Promise<GraphRoleAliasContext[]> => {
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
  const distinctStreamNames = Array.from(new Set(features.map((feature) => feature.stream_name)));
  await Promise.all(
    distinctStreamNames.map(async (streamName) => {
      try {
        const patterns = await reader.resolveIndexPatterns(streamName);
        indexPatternsByStream.set(streamName, patterns);
      } catch (error) {
        logger.warn(
          `[entity_store] Failed to resolve index patterns for stream ${streamName}: ${
            error instanceof Error ? error.message : String(error)
          }; graph aliases for this stream will be skipped`
        );
        indexPatternsByStream.set(streamName, []);
      }
    })
  );

  const contexts: GraphRoleAliasContext[] = [];
  for (const feature of features) {
    const indexPatterns = indexPatternsByStream.get(feature.stream_name) ?? [];
    if (indexPatterns.length === 0) {
      continue;
    }
    const aliases = validateGraphAliasTable(extractAliasesFromFeature(feature), {
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
