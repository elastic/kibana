/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const DEFAULT_HISTORY_SNAPSHOT_FREQUENCY = '24h';

export const LOG_EXTRACTION_DELAY_DEFAULT = '1m';
export const LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT = '3h';
export const LOG_EXTRACTION_FREQUENCY_DEFAULT = '1m';
// Max amount of entities to extract in one ESQL query
export const LOG_EXTRACTION_DOCS_LIMIT_DEFAULT = 10000;
// Max raw log documents per logs to be processed in a query (inside elastic search)
export const LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT = 40000;
export const LOG_EXTRACTION_TIMEOUT_DEFAULT = '59s';
export const LOG_EXTRACTION_MAX_TIME_WINDOW_SIZE_DEFAULT = '15m';

// Knowledge Indicators (KI) — controls Streams-derived entity extraction.
//
// The default for entityMinConfidence is intentionally high (99) so that the
// KI extraction loop, once wired in by the generic task, has no behavioral
// effect on existing deployments. Operators must explicitly lower this
// threshold via the API to opt their tenant into stream-derived entities.
// This avoids carrying a separate boolean feature flag and a flag-removal
// PR later: as confidence in the feature grows, we lower the default.
export const KI_ENTITY_MIN_CONFIDENCE_DEFAULT = 99;
// Hard upper bound on the number of distinct (stream, subtype) groups the
// generic task will process per run. Exceeding this triggers a warn log,
// telemetry, and deterministic truncation (sorted by stream, subtype) so
// behavior is reproducible. The cap protects task budget against runaway
// LLM-emitted feature counts.
export const KI_AGGREGATION_GROUP_CAP_DEFAULT = 200;

// Knowledge Indicators promotion — gates the `ki-promotion` maintainer.
//
// Both knobs default to a no-op so promotion is OFF on any tenant that has
// not explicitly opted in. The maintainer is registered unconditionally
// (so the route surface is consistent), but its run callback returns
// early when these defaults are in effect, mirroring the extraction
// loop's high-threshold pattern. Operators opt in by setting BOTH:
//   - `promoteToTypedThreshold` to a non-null value (>= `entityMinConfidence`)
//   - `promotedEntityTypes` to a non-empty subset of `['host', 'service']`
// Either knob being at its default is treated as off.
export const KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT = null;
export const KI_PROMOTED_ENTITY_TYPES_DEFAULT: ReadonlyArray<'host' | 'service'> = [];

// Knowledge Indicators schema-feature alias adoption — gates the
// schema-feature `ecs_identity_aliases` projection inside the static
// engine extraction path (Option E from the entity-store-ki-integration
// research notes). When `null` the loader short-circuits before any I/O,
// so disabled tenants pay zero cost and behavior is byte-identical to
// pre-Option-E. When set to a number 0–100, only schema features at or
// above that confidence contribute aliases; the LLM's intended actor-
// identity scoping is enforced via each feature's `filter`. Conservative
// default (off) follows the same opt-in pattern as `entityMinConfidence`
// (default 99) and `promoteToTypedThreshold` (default null) — the cost
// of adopting a wrong alias is merging two real entities into one, which
// is exactly the false-merge risk the "off by default" stance avoids.
export const KI_SCHEMA_ALIAS_MIN_CONFIDENCE_DEFAULT = null;

export type LogExtractionConfig = z.infer<typeof LogExtractionConfig>;
export const LogExtractionConfig = z.object({
  additionalIndexPatterns: z.array(z.string()).default([]),
  excludedIndexPatterns: z.array(z.string()).default([]),
  fieldHistoryLength: z.number().int().default(10),
  lookbackPeriod: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT),
  delay: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_DELAY_DEFAULT),
  docsLimit: z.number().int().min(1).default(LOG_EXTRACTION_DOCS_LIMIT_DEFAULT),
  maxLogsPerPage: z.number().int().min(1).default(LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT),
  timeout: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_TIMEOUT_DEFAULT),
  frequency: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_FREQUENCY_DEFAULT),
  maxTimeWindowSize: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_MAX_TIME_WINDOW_SIZE_DEFAULT),
});

export type HistorySnapshotStatus = z.infer<typeof HistorySnapshotStatus>;
export const HistorySnapshotStatus = z.enum(['started', 'stopped']);

export type HistorySnapshotState = z.infer<typeof HistorySnapshotState>;
export const HistorySnapshotState = z.object({
  status: HistorySnapshotStatus.default('started'),
  frequency: z
    .string()
    .regex(/[smdh]$/)
    .default(DEFAULT_HISTORY_SNAPSHOT_FREQUENCY),
  lastExecutionTimestamp: z.string().optional(),
  lastError: z
    .object({
      message: z.string(),
      timestamp: z.string().optional(),
    })
    .optional(),
});

export type KnowledgeIndicatorsConfig = z.infer<typeof KnowledgeIndicatorsConfig>;
export const KnowledgeIndicatorsConfig = z.object({
  entityMinConfidence: z.number().int().min(0).max(100).default(KI_ENTITY_MIN_CONFIDENCE_DEFAULT),
  aggregationGroupCap: z.number().int().min(1).default(KI_AGGREGATION_GROUP_CAP_DEFAULT),
  /**
   * Promotion confidence threshold. When `null` the `ki-promotion` maintainer
   * is a runtime no-op. When set, must be `>=` the active `entityMinConfidence`
   * (enforced at the route layer in `update.ts`) so a candidate is always
   * extracted before it can be promoted.
   */
  promoteToTypedThreshold: z
    .number()
    .int()
    .min(0)
    .max(100)
    .nullable()
    .default(KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT),
  /**
   * Allow-list of static engines the maintainer may promote into. Empty list
   * means promotion is off even if `promoteToTypedThreshold` is set. User
   * tier is intentionally absent in v1 (see strategy doc, Section 8).
   */
  promotedEntityTypes: z
    .array(z.enum(['host', 'service']))
    .default([...KI_PROMOTED_ENTITY_TYPES_DEFAULT]),
  /**
   * Schema-feature ECS identity alias confidence threshold. When `null` the
   * extraction loop never reads schema features and behaves byte-identically
   * to pre-Option-E. When set, the static engines run an extra extraction
   * pass per stream that has a schema feature at or above this confidence
   * with a valid `properties.ecs_identity_aliases` table. Conservative
   * default (off) — the cost of a wrong alias is two real entities merging
   * into one, so opt-in is mandatory.
   */
  schemaAliasMinConfidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .nullable()
    .default(KI_SCHEMA_ALIAS_MIN_CONFIDENCE_DEFAULT),
});

export type EntityStoreGlobalState = z.infer<typeof EntityStoreGlobalState>;
export const EntityStoreGlobalState = z.object({
  historySnapshot: HistorySnapshotState,
  logsExtraction: LogExtractionConfig,
  knowledgeIndicators: KnowledgeIndicatorsConfig,
});
