/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpVerdict } from '../constants';

/**
 * Ids and routes are inlined rather than imported from the AlertZero packages, like
 * `../constants.ts`, so this functional-tests package takes no runtime dependency on
 * them. They mirror:
 *   - SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID, ALERTZERO_WORKERS_URL,
 *     API_VERSIONS.internal.v1, SECURITY_SERVICE_ACCOUNT_URL and
 *     WORKER_SERVICE_ACCOUNT_NAMES (@kbn/alertzero-common)
 *   - ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID and the review's concurrency key
 *     (@kbn/workflows/managed, attack_discovery_review.yaml)
 *   - ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND (@kbn/elastic-assistant-common)
 */

export const WORKER_MODE_OUTCOMES = ['fp', 'tp', 'inconclusive'] as const;

export type WorkerModeOutcome = (typeof WORKER_MODE_OUTCOMES)[number];

export const WORKER_MODE_OUTCOME_VERDICTS: Readonly<Record<WorkerModeOutcome, FpTpVerdict>> = {
  fp: 'false_positive',
  tp: 'true_positive',
  inconclusive: 'inconclusive',
};

/**
 * The example `--outcome` seeds. Several examples share each gold; these are the ones
 * whose verdict does not hinge on a degraded source, so the outcome is the most
 * repeatable. `--example` seeds any other.
 */
export const WORKER_MODE_DEFAULT_EXAMPLES: Readonly<Record<WorkerModeOutcome, string>> = {
  fp: 'encoded-powershell.fp',
  tp: 'encoded-powershell.tp',
  inconclusive: 'encoded-powershell.fp-events-truncated',
};

export const AD_WORKER_ID = 'system-security-floor-attack-discovery';

export const AD_REVIEW_WORKFLOW_ID = 'system-security-attack-discovery-review';

/** The review serializes per attack on this key, which also finds its executions. */
export const adReviewConcurrencyKey = (attackDiscoveryId: string): string =>
  `attack-discovery-review-${attackDiscoveryId}`;

/** Name of the AD Worker's service account; its built-in role has the same name on stateful. */
export const AD_WORKER_SERVICE_ACCOUNT_NAME = 'alertzero_attack_discovery';

export const ALERTZERO_WORKERS_ROUTE = '/internal/alertzero/workers';

export const ALERTZERO_INTERNAL_API_VERSION = '1';

export const SERVICE_ACCOUNT_ROUTE = '/internal/security/service_account';

export const ANONYMIZATION_FIELDS_FIND_ROUTE =
  '/api/security_ai_assistant/anonymization_fields/_find';

/** Per-space Advanced Setting the generation step refuses to run without. */
export const AD_WORKFLOWS_SETTING = 'securitySolution:enableAttackDiscoveryWorkflows';

export const UI_SETTINGS_ROUTE = '/internal/kibana/settings';

/** Per-space index Attack Discovery generation reads; created lazily (security-team#20129). */
export const anonymizationFieldsIndexForSpace = (space: string): string =>
  `.kibana-elastic-ai-assistant-anonymization-fields-${space}`;

/** Where the last seeded alert lands relative to the seed time. */
export const WORKER_MODE_LAST_ALERT_OFFSET_MS = 5 * 60 * 1000;

/** Raw endpoint events the analysis reads, across every namespace. */
export const RAW_EVENTS_INDEX_PATTERN = 'logs-endpoint.events.*';
