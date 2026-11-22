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

/**
 * The generation graph's hallucination-failure limit ending a batch (see
 * `throw_if_error_counts_exceeded`): the producer's terminal headline. The collector reads the
 * error through the run step, which prefixes a failed generation execution with
 * `Generation workflow failed: ` (`extractGenerationWorkflowResult`), so the anchor allows that
 * known prefix and nothing else — a phrase echoed only in the appended details, which the
 * attempt-limit diagnostic can carry, never classifies a batch. The attempts-exhaustion line is
 * deliberately NOT matched: `generationAttempts` also counts connector exceptions thrown before
 * any response was received, so that error does not establish a model-output failure. Matched
 * against generation batch errors only; like `MODEL_REFUSAL_PATTERN` it must hold for every
 * failed batch.
 */
export const MODEL_OUTPUT_EXHAUSTED_PATTERN =
  /^(?:Generation workflow failed: )?Maximum hallucination failures \(\d+\) reached\./;

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
/** Detached same-run and cross-run attachments; the runner does not wait for them. */
export const ATTACH_DISPATCH_STEP_ID = 'run_attach';
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
 * runs as soon as the worker is enabled (see `settleEnableTimeRun` for how that tick is handled).
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
 * Two rows go through `runViaFloorParent` instead of a plain run: the seeded false-positive row's
 * review and the large-batch row's runner. Each waits for the floor to go idle before the rewrite
 * and for its cancelled executions to settle before the restore.
 */
const FLOOR_PARENT_RUN_COUNT = 2;
const FLOOR_PARENT_RUN_WAITS_MS = 2 * FLOOR_IDLE_WAIT_MS + FLOOR_TICK_CANCEL_TIMEOUT_MS;

/**
 * `cancelPending` waits up to `CANCEL_SETTLE_TIMEOUT_MS` (= `FLOOR_TICK_CANCEL_TIMEOUT_MS`) for the
 * cancelled executions to end, in parallel, so each call costs one settle. Every row that seeds
 * calls it once in its cleanup; the seeded false-positive row calls it once more before its
 * floor-parent review. The floor-parent runs' own cancel settle is in `FLOOR_PARENT_RUN_WAITS_MS`.
 */
const CANCEL_SETTLES_PER_ROW = 1;
const SEEDED_ROW_EXTRA_CANCEL_SETTLES = 1;

/**
 * Playwright runs every row inside one test, so its timeout has to cover each row hitting its own
 * timeouts, `FLOOR_IDLE_WAIT_MS` for each floor settle, one cancel settle for each row's cleanup,
 * the seeded false-positive row's extra review wait and extra cancel settle, and the waits of both
 * floor-parent rows. The large-batch row's runner wait is already
 * inside its row's `RUNNER_TIMEOUT_MS`. Otherwise a slow model is killed mid-dataset with no
 * scores, and the failure reads as a generic test timeout instead of the suite's labeled one.
 *
 * Every repetition re-runs all rows serially inside the same test, so the budget is per pass times
 * `repetitions`.
 */
export const getPlaywrightTestTimeoutMs = (rowCount: number, repetitions = 1): number =>
  repetitions *
  (rowCount *
    (RUNNER_TIMEOUT_MS +
      REVIEW_SETTLE_TIMEOUT_MS +
      ROW_OVERHEAD_MS +
      FLOOR_IDLE_WAIT_MS +
      CANCEL_SETTLES_PER_ROW * FLOOR_TICK_CANCEL_TIMEOUT_MS) +
    REVIEW_SETTLE_TIMEOUT_MS +
    SEEDED_ROW_EXTRA_CANCEL_SETTLES * FLOOR_TICK_CANCEL_TIMEOUT_MS +
    FLOOR_PARENT_RUN_COUNT * FLOOR_PARENT_RUN_WAITS_MS);

/**
 * The repetitions `createPlaywrightEvalsConfig` will use: it reads `EVAL_REPETITIONS` first (the
 * CLI's `--repetitions` sets it), then the config's value, which this suite pins to 1.
 */
export const getEvalRepetitions = (): number =>
  parseInt(process.env.EVAL_REPETITIONS || '', 10) || 1;

export const COHORT_ENV = 'AD_WORKER_EVAL_COHORT';
/** Comma-separated scenario ids; when set, the spec scores only those rows (a focused run). */
export const SCENARIOS_ENV = 'AD_WORKER_EVAL_SCENARIOS';
