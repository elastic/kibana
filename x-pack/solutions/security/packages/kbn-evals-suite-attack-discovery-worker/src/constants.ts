/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ALERTZERO_ENABLED_SETTING_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
} from '@kbn/alertzero-common';

/**
 * Workflow ids are literals, not imports from `@kbn/workflows/managed`: that barrel requires `.yaml`
 * files, which Jest transforms but the Playwright loader cannot parse, so importing it here breaks
 * the config load. `constants.test.ts` pins them to the managed definitions.
 */
/** The runner is a global workflow; it runs in a space through the space-prefixed API path. */
export const RUNNER_WORKFLOW_ID = 'system-security-attack-discovery-worker';
export const REVIEW_WORKFLOW_ID = 'system-security-attack-discovery-review';
/** The review's analysis child: its `analyze` step is where the review stage calls the model. */
export const FP_TP_WORKFLOW_ID = 'system-security-attack-discovery-fp-tp-analysis';
/** The runner's generation child: a refused batch leaves its error on this child's steps. */
export const BATCHED_GENERATION_WORKFLOW_ID = 'system-security-attack-discovery-batched-generation';

/**
 * A model declining to answer, not the pipeline failing: the run step's refusal error
 * (`handle_model_refusal`) and the inference plugin's content-filter refusal. Matched against
 * generation batch errors and failed review execution errors.
 */
export const MODEL_REFUSAL_PATTERN =
  /refused to complete the response|finish_reason: content_filter/i;

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

/**
 * Schedule interval of the floor worker. It is also the runner's lookback, and seeded alert
 * timestamps sit well inside it. It is long so the only scheduled tick is the one Task Manager
 * runs as soon as the worker is enabled (a recurring task starts with runAt=now). The worker's
 * concurrency cancels the run in progress, so that tick would cancel, or be cancelled by, the
 * manual run: `enableFloorWorker` waits for it and cancels it before any row starts.
 */
export const FLOOR_SCHEDULE_INTERVAL = '24h';
/** How long enabling waits for the enable-time scheduled tick before assuming there is none. */
export const FLOOR_TICK_WAIT_MS = 60_000;
export const FLOOR_TICK_POLL_INTERVAL_MS = 2_000;
/**
 * How long a row waits for the floor worker (or its child) to go idle. The engine only schedules a
 * parent's resume after its child ends, so the parent stays active for a moment.
 */
export const FLOOR_IDLE_WAIT_MS = 120_000;
/** How long a cancelled scheduled tick has to leave its concurrency slot. */
export const FLOOR_TICK_CANCEL_TIMEOUT_MS = 60_000;
export const SEED_WINDOW_MS = 20 * 60_000;
export const SEED_WINDOW_END_OFFSET_MS = 60_000;

/**
 * Per-row budget, sized from observed runs rather than worst-case stack stalls: the runner
 * (generation + floor round-trip) finishes well inside 15 minutes for the tier models, and the
 * review settle inside 10. These are still generous ceilings — a row that exceeds them is stuck,
 * not slow, and should fail with the suite's labeled timeout.
 */
export const RUNNER_TIMEOUT_MS = 15 * 60_000;
export const REVIEW_SETTLE_TIMEOUT_MS = 10 * 60_000;
export const POLL_INTERVAL_MS = 5_000;

/** Per row, on top of the runner and review timeouts: seeding, cleanup and the judge calls. */
export const ROW_OVERHEAD_MS = 5 * 60_000;

/**
 * Playwright runs every row inside one test, so its timeout has to cover each row hitting its own
 * timeouts, the seeded false-positive row's extra review wait, and `FLOOR_IDLE_WAIT_MS` for each
 * floor settle and idle wait. Otherwise a slow model is killed mid-dataset with no scores, and the
 * failure reads as a generic test timeout instead of the suite's labeled one.
 */
export const getPlaywrightTestTimeoutMs = (rowCount: number): number =>
  rowCount * (RUNNER_TIMEOUT_MS + REVIEW_SETTLE_TIMEOUT_MS + ROW_OVERHEAD_MS + FLOOR_IDLE_WAIT_MS) +
  REVIEW_SETTLE_TIMEOUT_MS +
  2 * FLOOR_IDLE_WAIT_MS;

export const COHORT_ENV = 'AD_WORKER_EVAL_COHORT';
/** Comma-separated scenario ids; when set, the spec scores only those rows (a focused run). */
export const SCENARIOS_ENV = 'AD_WORKER_EVAL_SCENARIOS';
