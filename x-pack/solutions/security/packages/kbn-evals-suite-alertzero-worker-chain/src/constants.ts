/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared constants for the AlertZero L4 worker-chain eval harness.
 *
 * Route paths and API versions are inlined rather than imported from the
 * owning plugins (same convention as the fp-tp suite) so this package takes no
 * runtime dependency on them. They mirror:
 *   - the managed AlertZero workflow ids (@kbn/workflows/managed)
 *   - ALERTZERO_WORKERS_URL / ALERTZERO_API_VERSION (@kbn/alertzero-common)
 *   - PROPOSALS_INTERNAL_URL / PROPOSALS_API_VERSION (@kbn/proposals-common)
 *   - the workflows_management and agent_builder public API versions
 */

/**
 * Registered Worker ids (SYSTEM_SECURITY_WORKER_CATALOG). These address the
 * Workers API (settings capture/write/read/restore) and nothing else. They are
 * NOT workflow ids: the AD Worker is `floor-attack-discovery`, while the
 * workflow the harness runs for AD is the `attack-discovery-worker` runner
 * (WORKFLOW_IDS.attackDiscoveryRunner). Guarded by constants.test.ts.
 */
export const WORKER_IDS = {
  alertTriage: 'system-security-floor-alert-triage',
  attackDiscovery: 'system-security-floor-attack-discovery',
  ruleTuning: 'system-security-detection-rule-tuning',
} as const;

export const WORKFLOW_IDS = {
  alertTriage: 'system-security-floor-alert-triage',
  alertTriageReview: 'system-security-floor-alert-triage-review',
  // R2: the harness drives AD through the per-space floor_attack_discovery
  // workflow (scheduled-only in the product), never the bare runner below —
  // the runner's run_generation uses run-as-mode inherit with no parent SA.
  attackDiscovery: 'system-security-floor-attack-discovery',
  // The Attack Discovery "runner" is the managed worker workflow whose YAML is
  // attack_discovery_runner.yaml; its id is the WORKER id (verified against
  // ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID upstream, see constants.test.ts).
  attackDiscoveryRunner: 'system-security-attack-discovery-worker',
  attackDiscoveryReview: 'system-security-attack-discovery-review',
  forensicsSweep: 'system-security-forensics-endpoint-analysis',
  forensicsRun: 'system-security-forensics-run-endpoint-analysis',
} as const;

export const ACTION_IDS = {
  // 'system-alertzero-action-close-alerts-false-positive' does not exist; the
  // close-fp action workflow id is the short form (action_close_alerts_false_positive.ts:18).
  closeAlertsFp: 'system-alertzero-action-close-alerts-fp',
  handoffToForensics: 'system-alertzero-action-handoff-to-forensics',
  isolateHost: 'system-alertzero-action-isolate-host',
  killProcess: 'system-alertzero-action-kill-process',
  suspendProcess: 'system-alertzero-action-suspend-process',
  addRuleException: 'system-alertzero-action-add-rule-exception',
  editRule: 'system-alertzero-action-edit-rule',
} as const;

/** Rule Tuning's gated actions (rule_tuning_review.yaml:973,1035,1069): attributed to the `rule-tuning` worker. */
export const RULE_TUNING_ACTION_IDS: ReadonlySet<string> = new Set([
  ACTION_IDS.addRuleException,
  ACTION_IDS.editRule,
]);

export const PUBLIC_API_VERSION = '2023-10-31';
export const ALERTZERO_API_VERSION = '1';
export const PROPOSALS_API_VERSION = '1';

export const ALERTZERO_WORKERS_URL = '/internal/alertzero/workers';

/** ALERTZERO_ENABLED_SETTING_ID (@kbn/alertzero-common): per-space gate on every alertzero route. */
export const ALERTZERO_ENABLED_SETTING_ID = 'securitySolution:enableAlertZero';

/** security_solution's per-space alert-analysis settings route (the setting itself is readonly). */
export const ALERT_ANALYSIS_SETTINGS_URL =
  '/internal/security_solution/alert_analysis_workflow/settings';
export const ALERT_ANALYSIS_SETTINGS_API_VERSION = '1';

/** SECURITY_SERVICE_ACCOUNT_URL (@kbn/alertzero-common). */
export const SECURITY_SERVICE_ACCOUNT_URL = '/internal/security/service_account';
export const PROPOSALS_URL = '/internal/proposals';

export const INFERENCE_SETTINGS_ROUTE = '/internal/search_inference_endpoints/settings';
export const INFERENCE_SETTINGS_API_VERSION = '1';
export const ALERTZERO_REASONING_FEATURE_ID = 'alertzero_reasoning';

/**
 * Per-hop timeouts (design Rev 3 §4). Supervised terminal = every hop reaches
 * a final state or its per-hop timeout fires; an overrun names the hop.
 */
export const HOP_TIMEOUTS_MS = {
  alertTriage: 15 * 60_000,
  alertTriageReview: 10 * 60_000,
  attackDiscoveryRunner: 20 * 60_000,
  attackDiscoveryReview: 20 * 60_000,
  kiAnalysisIndicator: 5 * 60_000,
  forensicsSweepTick: 3 * 60_000,
  forensicsRun: 20 * 60_000,
  perActionProposal: 5 * 60_000,
} as const;

/**
 * Hop status the harness records for a review that is not terminal but settled
 * by design: it raised its proposal and is parked on its escalation gate
 * awaiting a human decision (Manual/Assisted autonomy). Distinct from the
 * engine's own statuses so ChainTerminal scores it as a reached outcome, while
 * failed/cancelled/skipped hops stay a real 0.
 */
export const PARKED_HOP_STATUS = 'parked';

/**
 * Experiment concurrency for the worker-chain spec. The AD worker scans the
 * whole space, so one example's AD hop and reviews would pick up another
 * example's seeded alerts; seeding and cleanup therefore cannot overlap
 * either. Fixed at 1, overriding --concurrency / EVAL_CONCURRENCY.
 */
export const WORKER_CHAIN_EXPERIMENT_CONCURRENCY = 1;

/** Examples the spec runs when no subset is selected (non-`failed` FP/TP worlds). */
export const WORKER_CHAIN_EXAMPLE_COUNT = 21;

/**
 * The Buildkite eval step is killed at 120 min (run_suite.sh sets
 * `timeout_in_minutes` to 120 unless the suite declares `stepTimeoutInMinutes`,
 * which this suite does not). The step env does not forward
 * `WORKER_CHAIN_EXAMPLES`, so a CI run always selects every example.
 */
export const WORKER_CHAIN_CI_STEP_BUDGET_MS = 120 * 60 * 1000;

/** Env var selecting a subset of examples: comma-separated example ids and/or named subsets. */
export const WORKER_CHAIN_EXAMPLES_ENV = 'WORKER_CHAIN_EXAMPLES';

/**
 * Frozen named subsets for `WORKER_CHAIN_EXAMPLES`. `smoke6` is the pinned
 * re-smoke set: 3 true-positive + 3 false-positive worlds across both
 * scenarios. The ids are pinned here so a smoke run is comparable across runs;
 * example_selection.test.ts asserts they exist and split 3 TP / 3 FP.
 */
export const WORKER_CHAIN_SUBSETS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  smoke6: Object.freeze([
    'encoded-powershell.tp',
    'encoded-powershell.tp-entities-missing',
    'mimicrat-clickfix.tp',
    'encoded-powershell.fp',
    'mimicrat-clickfix.fp-benign-mimic',
    'mimicrat-clickfix.fp-network-only',
  ]),
});

/**
 * Explicit cap on the AD reviews one chain waits for. One floor run can
 * dispatch several reviews (one per discovered attack); the chain waits for
 * each, then for every proposal source (the triage Investigation plus one per
 * review). The runner enforces this cap — reviews past it are not waited for and
 * the run is marked as harness interference — so the per-chain bound below is a
 * real ceiling, not a one-review estimate.
 */
export const WORKER_CHAIN_MAX_REVIEWS_PER_CHAIN = 3;

/**
 * Upper bound of one serial chain at the per-hop caps: triage + AD runner +
 * N reviews + one proposal wait per proposal source (N reviews + the triage
 * Investigation), N = WORKER_CHAIN_MAX_REVIEWS_PER_CHAIN. The Playwright
 * timeout is selected examples x EVAL_REPETITIONS x this bound.
 */
export const WORKER_CHAIN_MAX_CHAIN_MS =
  HOP_TIMEOUTS_MS.alertTriage +
  HOP_TIMEOUTS_MS.attackDiscoveryRunner +
  WORKER_CHAIN_MAX_REVIEWS_PER_CHAIN * HOP_TIMEOUTS_MS.attackDiscoveryReview +
  (WORKER_CHAIN_MAX_REVIEWS_PER_CHAIN + 1) * HOP_TIMEOUTS_MS.perActionProposal;

/**
 * Contract marker carried by every ExecutionIdArray result. The per-attack
 * review Investigation expectation encodes review.yaml:263 as it behaves today;
 * which execution id it SHOULD carry (D55) is an open product decision this
 * evaluator does not answer.
 */
export const EXECUTION_ID_CONTRACT_MARKER =
  'contract: review.yaml:263 current behaviour; D55 owner open';

export const DEFAULT_POLL_INTERVAL_MS = 3_000;

/** The forensics sweep's schedule interval, from forensics_endpoint_analysis.yaml. */
export const FORENSICS_SWEEP_INTERVAL_MS = 60_000;
