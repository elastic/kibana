/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Worker's managed workflow id. Installed per-space (templated as
 * `{WORKER_WORKFLOW_ID}-{spaceId}`) once the Worker is enabled in that space — it does not
 * exist globally the way the four hunt children below do. The eval asserts the installed
 * per-space document; it does not create or carry its own copy, so eval and production
 * cannot drift.
 */
export { ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID as HUNT_WORKER_WORKFLOW_ID } from '@kbn/workflows/managed';

/**
 * The four hunt child workflows the Worker's `report_fan_out` branch invokes via
 * `workflow.execute`. Installed globally at plugin start (installStatic /
 * ALERTZERO_WATCH_WORKFLOW_IDS), unlike the per-space Worker above.
 */
export {
  ALERTZERO_HUNT_WORKFLOW_ID as HUNT_EXECUTE_WORKFLOW_ID,
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID as HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID as HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID as HUNT_PROPOSAL_GATE_WORKFLOW_ID,
} from '@kbn/workflows/managed';

/**
 * Public workflows_management API version (`Elastic-Api-Version` header). Inlined: the source
 * of truth (API_VERSION in workflows_management route constants) lives in the plugin, not a
 * package.
 */
export const WORKFLOWS_API_VERSION = '2023-10-31';

/** Internal AlertZero API version used by `/internal/alertzero/*` routes. */
export const ALERTZERO_INTERNAL_API_VERSION = '1';

/**
 * Step ids from the managed Worker yaml
 * (`kbn-workflows/managed/definitions/alertzero/hunt_continuous_threat_hunt.yaml`) that the
 * client and evaluators address directly. A rename here must be mirrored below or installed
 * workflow checks fail loudly instead of surfacing as opaque poll timeouts downstream.
 */
export const CHECK_INDEX_SCOPE_STEP_ID = 'check_index_scope';
export const RESOLVE_INDEX_SCOPE_GATE_STEP_ID = 'resolve_index_scope_gate';
export const SELECT_CANDIDATE_REPORTS_STEP_ID = 'select_candidate_reports';
export const FIND_OR_CREATE_INVESTIGATION_STEP_ID = 'find_or_create_investigation';
export const HUNT_STEP_ID = 'hunt';
export const PACKAGE_REPORT_STEP_ID = 'package_report';
export const WRITE_RUN_CONCLUSION_STEP_ID = 'write_run_conclusion';
export const RESOLVE_RUN_OUTCOME_STEP_ID = 'resolve_run_outcome';

/** Every step id the Worker yaml must still declare for the client/evaluators to work. */
export const REQUIRED_WORKER_STEP_IDS = [
  CHECK_INDEX_SCOPE_STEP_ID,
  RESOLVE_INDEX_SCOPE_GATE_STEP_ID,
  SELECT_CANDIDATE_REPORTS_STEP_ID,
  FIND_OR_CREATE_INVESTIGATION_STEP_ID,
  HUNT_STEP_ID,
  PACKAGE_REPORT_STEP_ID,
  WRITE_RUN_CONCLUSION_STEP_ID,
  RESOLVE_RUN_OUTCOME_STEP_ID,
] as const;

/** Eval space ids. `default` is seeded directly; the other three are created by the preflight. */
export const DEFAULT_EVAL_SPACE_ID = 'default';
export const HUNT_A_SPACE_ID = 'hunt-a';
export const HUNT_B_SPACE_ID = 'hunt-b';
export const HUNT_BLOCKED_SPACE_ID = 'hunt-blocked';

/** All eval spaces the Worker is enabled in by the preflight fixture. */
export const EVAL_SPACE_IDS = [
  DEFAULT_EVAL_SPACE_ID,
  HUNT_A_SPACE_ID,
  HUNT_B_SPACE_ID,
  HUNT_BLOCKED_SPACE_ID,
] as const;

/** Index pattern that resolves to no indices/data streams/aliases, used to induce `blocked`. */
export const HUNT_BLOCKED_INDEX_PATTERN = 'logs-hunt-eval-nonexistent-*';

/**
 * Fixture report ids from the Demo C+ generator (elastic/kibana#291895). Bound in Phase 2 once
 * the generator fixtures land on `main` — listed here now (per the plan's locked decisions) so
 * downstream constants have a single source, but nothing in Phase 1 seeds or asserts against
 * them yet.
 */
export const TI_REPORT_AWS_IAM_PREFIX = 'ti-report-aws-iam';
export const TI_REPORT_CANARY_ID = 'ti-report-hunt-eval-canary-01';
export const TI_REPORT_MISSING_ID = 'ti-report-hunt-eval-missing-01';
