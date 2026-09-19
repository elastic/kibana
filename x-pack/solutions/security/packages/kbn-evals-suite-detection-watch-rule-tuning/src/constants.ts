/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared constants for the rule-tuning managed workflow eval suite.
 *
 * Ported 2026-09-11 from the fork-stranded suite (hannahbrooks#9 /
 * patrykkopycinski#15) for the post-#290097 main architecture: the old
 * unified `system-security-rule-tuning` workflow was split into a
 * fan-out worker plus a per-rule review child.
 *
 * Inlined (rather than imported from `@kbn/workflows/managed`) to keep this
 * functional-tests package free of a runtime dependency on the security
 * solution plugin. They mirror:
 *   - ALERTZERO_RULE_TUNING_(WORKER|REVIEW)_WORKFLOW_ID (@kbn/workflows/managed)
 *   - WORKFLOWS_API_VERSION (workflows_management route constants)
 */

/**
 * Managed sweep workflow installed globally by the security solution plugin.
 * Harvests FP-alert clusters per rule and fans out one review child per rule.
 */
export const RULE_TUNING_WORKER_WORKFLOW_ID = 'system-security-rule-tuning-worker';

/**
 * Per-rule child workflow: fetch rule → diagnose (ai.agent) → backtest
 * previews → waitForApproval gate → apply/tag. The diagnose step's
 * structured_output is what this suite grades.
 */
export const RULE_TUNING_REVIEW_WORKFLOW_ID = 'system-security-rule-tuning-review';

/** Public workflows_management API version (`Elastic-Api-Version` header). */
export const WORKFLOWS_API_VERSION = '2023-10-31';

/**
 * The four branches the review workflow's `diagnose_rule` step can emit, in the
 * preference order its prompt declares (rule_tuning_review.yaml, root `oneOf`
 * since upstream #288807).
 *
 * `suppression` and `threshold` — the previous flat-enum values — are NOT
 * emittable: the workflow's apply steps only exist for exception, query and
 * risk_score, and everything else is a `manual` hand-off. A volume-only fix has
 * no in-band branch, so it has to be recommended through `manual`.
 */
export const CHANGE_TYPES = ['exception', 'query', 'risk_score', 'manual'] as const;

export type ChangeType = (typeof CHANGE_TYPES)[number];

/** Values the `risk_score` branch's `proposed_severity` accepts. */
export const PROPOSED_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

/**
 * `exception` branch operators mapped to the payload field each one requires
 * (see the `exception_entries` item union in rule_tuning_review.yaml). Operators
 * outside this map are not part of the workflow's schema.
 */
export const EXCEPTION_OPERATOR_PAYLOAD = {
  is: 'value',
  is_not: 'value',
  matches: 'value',
  does_not_match: 'value',
  is_one_of: 'values',
  is_not_one_of: 'values',
  exists: null,
  does_not_exist: null,
} as const;

/** Tag prefix the workflow writes to harvested alerts. Isolated to the eval namespace. */
export const EVAL_TAG_PREFIX = 'eval-rule-tuning';

/**
 * Tags the review workflow's `security.setAlertTags` steps write onto the harvested alerts,
 * mirroring `consts.*_tag` in `rule_tuning_review.yaml`. The approval spec asserts on these
 * tags as the observable side effect of each gate arm: `dismissed` only on a rejection,
 * `applied` only once `record_outcome.rule_patched` is true (i.e. the rule was really
 * patched). Keep in sync with the yaml — `approval_gate_contract.test.ts` fails if they drift.
 */
export const REVIEWED_TAG = 'detection-watch:tuning-reviewed';
export const DISMISSED_TAG = 'detection-watch:tuning-dismissed';
export const APPLIED_TAG = 'detection-watch:tuning-applied';
export const ACKNOWLEDGED_TAG = 'detection-watch:tuning-acknowledged';

/**
 * Step ids from the managed review workflow yaml
 * (`kbn-workflows/managed/definitions/alertzero/rule_tuning_review.yaml`). The
 * `diagnose_rule` step is the `ai.agent` step this suite grades, and it is the
 * step whose persisted `conversation_id` the trace evaluators use as their
 * second join key.
 */
export const DIAGNOSE_STEP_ID = 'diagnose_rule';

/**
 * Agent Builder tool the review's `diagnose_rule` step is instructed to call to
 * retrieve the harvested false positives. Consumed by the Tool Routing evaluator
 * (src/evaluators/tool_routing.ts) via tool-span counting on the run's trace.
 *
 * Note the tuning review drives the agent through the `investigate-rule` skill
 * (ALERTS_BY_IDS_MAX is why the workflow caps alert_ids at 100), NOT the
 * `security.create_detection_rule` tool the rule-creation suite's evaluator
 * counts — that line must not be copied over.
 */
export const RULE_TUNING_INVESTIGATE_TOOL_ID = 'investigate-rule.get_alerts_by_ids';
