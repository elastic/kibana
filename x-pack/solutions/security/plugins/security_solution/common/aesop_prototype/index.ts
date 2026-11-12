/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP v3 prototype — shared contract.
 *
 * AESOP (Agent Skill Optimization Protocol) is an end-to-end spike of the
 * skill lifecycle loop on current stack capabilities: explore skill-usage
 * telemetry, A/B a candidate skill variant against the live skill through the
 * evals plugin (CODE + judge evaluators), gate the winning variant behind
 * analyst approval, deploy it (skill PUT), and monitor for drift with online
 * evaluation.
 *
 * Everything this prototype adds is namespaced `aesop.prototype.*` /
 * `system-security-aesop-*` so the spike can be removed in one commit.
 */

/** Everything this prototype adds is prefixed with this. */
export const AESOP_PROTOTYPE_NAMESPACE = 'aesop.prototype' as const;

/** The explorer agent the loop's workflows talk to. */
export const AESOP_EXPLORER_AGENT_ID = 'aesop-explorer' as const;

/** Read-only skill the explorer agent runs with (registered behind the flag). */
export const AESOP_EXPLORER_SKILL_ID = 'aesop-skill-explorer' as const;

/** Evals task provider that runs an agent with a variant skill set. */
export const AESOP_VARIANT_TASK_PROVIDER_NAME = 'security.aesopVariant' as const;

/** Managed workflow ids, all prefixed `system-security-aesop-`. */
export const AESOP_AB_COMPARE_WORKFLOW_ID = 'system-security-aesop-ab-compare' as const;
export const AESOP_DRIFT_MONITOR_WORKFLOW_ID = 'system-security-aesop-drift-monitor' as const;

/** Tags the AESOP managed workflows carry. */
export const AESOP_WORKFLOW_TAGS = ['security', 'aesop_prototype'] as const;

/**
 * Evaluation config for the A/B run. The CODE evaluators are the five ported
 * from the skill-eval platform spike (#261057); the judge evaluator is
 * configured at runtime (connector picked in the workflow inputs).
 */
export const AESOP_CODE_EVALUATORS = [
  'skill-secret-scanner',
  'skill-prompt-injection',
  'skill-pii',
  'esql-compile',
  'skill-index-resolves',
] as const;

/** Default number of repetitions per example in the A/B run. */
export const AESOP_AB_DEFAULT_REPETITIONS = 2;

/** Default internal example concurrency for the A/B run. */
export const AESOP_AB_DEFAULT_CONCURRENCY = 2;

/** How long the analyst approval gate parks before the A/B result expires. */
export const AESOP_APPROVAL_EXPIRES_IN = '72h' as const;

/** Drift monitor cadence. */
export const AESOP_DRIFT_MONITOR_INTERVAL_MINUTES = 60;

/** Traces older than this are not graded by the drift monitor. */
export const AESOP_DRIFT_MONITOR_LOOKBACK_MINUTES = 120;

/** API version for the internal drift-monitor routes the A/B workflow calls. */
export const AESOP_DRIFT_MONITOR_ROUTES_API_VERSION = '2026-11-11' as const;

/** Internal route paths the A/B compare workflow calls around deploys. */
export const AESOP_DRIFT_MONITOR_ROUTE_PATH =
  '/internal/security_solution/aesop/drift_monitor' as const;
