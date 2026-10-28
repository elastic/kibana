/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Frozen clock every scenario authors its documents against, so they stay
 * byte-stable. Seeding shifts them forward to the current time.
 */
export const FP_TP_BASE_TIME = new Date('2026-07-13T12:00:00.000Z');

/**
 * Default run marker. The manual seed script uses it as-is, so one world at a
 * time lives under these ids; the eval derives a fresh marker per run from it.
 */
export const FP_TP_TWIN_SEED_LABEL = 'ad-fp-tp-twins-2026-09';

export const FP_TP_ENTITY_INDEX = '.entities.v2.latest.default';

/** Alias the workflow reads entities through. */
export const FP_TP_ENTITY_READ_ALIAS = 'entities-latest-default';

export const FP_TP_ATTACK_ADHOC_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-default';

/**
 * Alerts-as-data index of a Kibana space. On serverless this is a product-
 * managed data stream the seeder bootstraps via the detection engine API and
 * writes to with bulk `create` operations.
 */
export const fpTpAlertsIndexForSpace = (space: string): string =>
  `.alerts-security.alerts-${space}`;

/**
 * Ad-hoc Attack Discovery index of a Kibana space. The managed FP/TP analysis
 * workflow reads the persisted discovery from here, and the managed
 * `system-attack-discovery-validate` workflow is what persists it — the seeder
 * never writes this index directly on serverless.
 */
export const fpTpAdhocAttackIndexForSpace = (space: string): string =>
  `.adhoc.alerts-security.attack.discovery.alerts-${space}`;

/**
 * Entity Store read alias of a Kibana space.
 */
export const fpTpEntityReadAliasForSpace = (space: string): string => `entities-latest-${space}`;

/**
 * Rewrites a scenario-authored `logs-endpoint.events.<kind>-default` index to
 * the seeder-owned `logs-endpoint.events.fp-tp-<kind>-<namespace>` namespace.
 * On serverless the `-default` names are product-managed data streams a plain
 * `create` would collide with; the analysis workflow reads the
 * `logs-endpoint.events.*` wildcard, so the seeder-owned namespace stays in
 * scope. The `fp-tp-` marker is what the seeder-owned index template claims
 * (see `raw_events.ts`): without it the streams would fall under the generic
 * `logs` template and ECS fields would map as text.
 */
const ENDPOINT_EVENTS_LEADER = 'logs-endpoint.events.';

export const toServerlessEventIndex = (index: string, namespace: string): string => {
  if (!index.endsWith('-default')) {
    throw new Error(
      `Cannot seed ${index} on serverless: only scenario-authored -default event indices ` +
        'are rewritten to the seeder-owned namespace'
    );
  }
  const kind = index.slice(ENDPOINT_EVENTS_LEADER.length, -'-default'.length);
  return `${FP_TP_RAW_EVENT_INDEX_PREFIX}${kind}-${namespace}`;
};

/**
 * Id of the always-enabled no-match query rule the seeder keeps in a space. On
 * serverless `POST /api/detection_engine/index` only acknowledges the alerts
 * index; the backing data stream is provisioned by the first rule execution,
 * so the seeder needs one enabled rule that can never match.
 */
export const FP_TP_BOOTSTRAP_RULE_ID = 'fptp-seeder-bootstrap-nomatch';

/**
 * Inference feature id the managed FP/TP analysis workflow resolves its
 * connector through (`connector-id-by-feature`; `alertzero_template_models`
 * wins when the space maps it). Shared with the worker seeder.
 */
export { FP_TP_INFERENCE_FEATURE_ID as FP_TP_REASONING_FEATURE_ID } from '../constants';

/** Half-width of the raw-event window the analysis reads around the cited alerts' original time. */
export const FP_TP_RAW_EVENT_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Prefix of the seeder-owned raw-event data streams. The workflow reads
 * `logs-endpoint.events.*`, but on serverless the `logs-endpoint.events.<kind>-default`
 * names are product-managed data streams the seeder does not own: a plain
 * `create` into them is rejected, and a mapping-only write would be an ownership
 * violation. The `fp-tp-` segment keeps the seeded events inside the workflow's
 * wildcard while never colliding with a product stream, and the name does not
 * start with a dot.
 */
export const FP_TP_RAW_EVENT_INDEX_PREFIX = 'logs-endpoint.events.fp-tp-';

/**
 * Ingest pipeline every seeded raw event passes through, so `@timestamp` is a
 * parseable date and `event.ingested` reflects ingest time. The workflow's
 * `load_events` step looks back a fixed window, so a stale or malformed
 * `@timestamp` would leave the seeded events invisible.
 */
export const FP_TP_RAW_EVENT_INGEST_PIPELINE = 'alertzero-fp-tp-raw-events';

/**
 * Composable index template the seeder owns for its raw-event streams. A name in
 * `logs-endpoint.events.*` matches the generic `logs` template (`logs-*-*`,
 * data_stream), so a plain index is refused; the seeder defines its own
 * data-stream template above it (see `raw_events.ts`).
 */
export const FP_TP_RAW_EVENT_INDEX_TEMPLATE = 'alertzero-fp-tp-raw-events';

/**
 * Raw events the analysis reads per run (`load_events` `size`). More hits than this
 * mark the page truncated, and `block_truncated_clear` turns a `false_positive` into
 * `inconclusive`.
 */
export const FP_TP_RAW_EVENT_PAGE_SIZE = 50;
