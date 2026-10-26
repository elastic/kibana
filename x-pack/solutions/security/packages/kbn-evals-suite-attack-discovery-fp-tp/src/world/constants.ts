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
 * Id of the always-enabled no-match query rule the seeder keeps in a space. On
 * serverless `POST /api/detection_engine/index` only acknowledges the alerts
 * index; the backing data stream is provisioned by the first rule execution,
 * so the seeder needs one enabled rule that can never match.
 */
export const FP_TP_BOOTSTRAP_RULE_ID = 'fptp-seeder-bootstrap-nomatch';

/**
 * Inference feature id the managed FP/TP analysis workflow resolves its
 * `alertzero-thin-agent` connector through. Keep in sync with
 * ALERTZERO_REASONING_INFERENCE_FEATURE_ID in @kbn/alertzero-common.
 */
export const FP_TP_REASONING_FEATURE_ID = 'alertzero_reasoning';

/** Half-width of the raw-event window the analysis reads around the cited alerts' original time. */
export const FP_TP_RAW_EVENT_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Raw events the analysis reads per run (`load_events` `size`). More hits than this
 * mark the page truncated, and `block_truncated_clear` turns a `false_positive` into
 * `inconclusive`.
 */
export const FP_TP_RAW_EVENT_PAGE_SIZE = 50;
