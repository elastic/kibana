/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
} from '@kbn/workflows/managed';

export {
  ALERTZERO_ENABLED_SETTING_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';

/** The runner is a global workflow; it runs in a space through the space-prefixed API path. */
export const RUNNER_WORKFLOW_ID = ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID;
export const REVIEW_WORKFLOW_ID = ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID;
/** The review's analysis child: its `analyze` step is where the review stage calls the model. */
export const FP_TP_WORKFLOW_ID = ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID;

/** A dedicated space keeps the runner's per-space concurrency key and the seeded alerts apart. */
export const EVAL_SPACE_ID = 'ad-worker-eval';

export const PUBLIC_API_VERSION = '2023-10-31';
export const DETECTION_ENGINE_API_VERSION = '2023-10-31';
export const ENTITY_API_VERSION = '2023-10-31';
export const INFERENCE_SETTINGS_ROUTE = '/internal/search_inference_endpoints/settings';
export const INFERENCE_SETTINGS_API_VERSION = '1';
export const UI_SETTINGS_ROUTE = '/internal/kibana/settings';
export const ANONYMIZATION_FIELDS_FIND_ROUTE =
  '/api/security_ai_assistant/anonymization_fields/_find';
export const AD_WORKFLOWS_SETTING = 'securitySolution:enableAttackDiscoveryWorkflows';

export const ENTITY_STORE_READY_TIMEOUT_MS = 120_000;
export const ENTITY_STORE_POLL_INTERVAL_MS = 2_000;
export const ALERTS_INDEX_TIMEOUT_MS = 180_000;
export const ALERTS_INDEX_POLL_INTERVAL_MS = 5_000;

export const BOOTSTRAP_RULE_ID = 'ad-worker-eval-bootstrap-nomatch';
export const BOOTSTRAP_RULE_QUERY = 'data_stream.dataset:never-matches-ad-worker-eval-bootstrap';

export const alertsIndexForSpace = (space: string): string => `.alerts-security.alerts-${space}`;
export const attackDiscoveryIndexForSpace = (space: string): string =>
  `.adhoc.alerts-security.attack.discovery.alerts-${space}`;
export const anonymizationFieldsIndexForSpace = (space: string): string =>
  `.kibana-elastic-ai-assistant-anonymization-fields-${space}`;

/** Step ids in the runner workflow definition. */
export const RUN_GENERATION_STEP_ID = 'run_generation';
export const RESOLVE_FANOUT_STEP_ID = 'resolve_fanout';
export const MATCH_FINGERPRINTS_STEP_ID = 'match_fingerprints';
export const REVIEW_DISPATCH_STEP_IDS: readonly string[] = ['run_review', 'run_unmatched_review'];
export const REPORT_RUN_COMPLETED_STEP_ID = 'report_run_completed';
export const REPORT_WORKER_RUN_COMPLETED_STEP_ID = 'report_worker_run_completed';
export const RUNNER_REQUIRED_STEP_IDS: readonly string[] = [
  RUN_GENERATION_STEP_ID,
  RESOLVE_FANOUT_STEP_ID,
  MATCH_FINGERPRINTS_STEP_ID,
  ...REVIEW_DISPATCH_STEP_IDS,
  REPORT_RUN_COMPLETED_STEP_ID,
  REPORT_WORKER_RUN_COMPLETED_STEP_ID,
  'emit_result',
];

/** Step ids in the review workflow definition. */
export const REVIEW_REQUIRED_STEP_IDS: readonly string[] = [
  'open_investigation',
  'resolve_analysis',
  'escalation_gate',
];

/** The review step that runs the FP/TP analysis workflow, and that workflow's model step. */
export const FP_TP_ANALYSIS_STEP_ID = 'run_fp_tp_analysis';
export const FP_TP_ANALYZE_STEP_ID = 'analyze';

export const FP_TP_REQUIRED_STEP_IDS: readonly string[] = [FP_TP_ANALYZE_STEP_ID];

/** Lookback handed to the runner; seeded alert timestamps are placed inside it. */
export const SCHEDULE_INTERVAL = '30m';
export const SEED_WINDOW_MS = 20 * 60_000;
export const SEED_WINDOW_END_OFFSET_MS = 60_000;

export const RUNNER_TIMEOUT_MS = 40 * 60_000;
export const REVIEW_SETTLE_TIMEOUT_MS = 20 * 60_000;
export const POLL_INTERVAL_MS = 5_000;

export const COHORT_ENV = 'AD_WORKER_EVAL_COHORT';
export const REFERENCE_MODEL_ENV = 'AD_WORKER_EVAL_REFERENCE_MODEL';
