/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * AESOP (Agent Skill Optimization Protocol) prototype. Everything it adds is
 * namespaced `aesop.prototype.*` / `system-security-aesop-*` so it can be
 * removed in one commit.
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

/** CODE evaluators for the A/B run; the judge connector comes from workflow inputs. */
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
export const AESOP_DRIFT_MONITOR_ROUTES_API_VERSION = '1';

/** Internal route paths the A/B compare workflow calls around deploys. */
export const AESOP_DRIFT_MONITOR_ROUTE_PATH =
  '/internal/security_solution/aesop/drift_monitor' as const;
