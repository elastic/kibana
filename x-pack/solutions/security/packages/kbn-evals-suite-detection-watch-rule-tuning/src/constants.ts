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
 * The six branches the review workflow's `diagnose_rule` step can emit, in the
 * preference order its prompt declares (rule_tuning_review.yaml, root `oneOf`
 * since upstream #288807, extended with `threshold` and `schedule` by #291874
 * and #294332).
 *
 * `suppression` — the previous flat-enum value — is NOT emittable: there is no
 * suppression branch, so a volume-only fix has to be recommended through
 * `manual`. `threshold` and `schedule` carry extra required payload fields
 * (see RuleTuningProposal and the evaluators).
 */
export const CHANGE_TYPES = [
  'exception',
  'query',
  'risk_score',
  'threshold',
  'schedule',
  'manual',
] as const;

export type ChangeType = (typeof CHANGE_TYPES)[number];

/** Values the `risk_score` branch's `proposed_severity` accepts. */
export const PROPOSED_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

/** Values the shared `confidence` field accepts on every branch. */
export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;

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

/**
 * Fixtures whose golden label is contested and awaits Seth/Andrew sign-off
 * (see g6-label-proposal.md on the tracking card). The product contract at
 * upstream main prefers `exception` whenever the FP cluster concentrates on
 * identifiable entities — including volume, low-value and new_terms clusters —
 * so these labels measure the reviewer's proposed contract, not an agreed one.
 * `ChangeTypeAccuracyUncontested` scores only the remaining fixtures; the
 * coverage-characterization test asserts this list stays well-formed.
 * No gold label changes without sign-off: this list documents the dispute.
 */
export const CONTESTED_FIXTURE_IDS = [
  // volume + low-value families: identifiable entities → `exception` outranks
  // `manual`/`risk_score` by the prompt's preference order (rule_tuning_review.yaml:341)
  'fp-volume-suppression',
  'fp-suppression-healthcheck',
  'fp-suppression-vulnscan',
  'fp-suppression-inventory',
  'fp-suppression-patchagent',
  'fp-low-value-risk',
  'fp-low-value-scripting',
  'fp-low-value-admin-tools',
  'fp-low-value-devtools',
  'fp-low-value-remote-support',
  'fp-low-value-archive',
  // new_terms: exceptions are applied by the runtime at upstream main, so
  // `manual` is not forced by the rule type
  'fp-manual-newterms-dns',
  'fp-manual-newterms-proxy',
  'fp-manual-newterms-vpn',
  'fp-manual-newterms-ntp',
] as const;

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

/**
 * Agent Builder skill that owns `RULE_TUNING_INVESTIGATE_TOOL_ID`.
 *
 * The tuning eval stack's Scout config set does not enable it, so the review's
 * `diagnose_rule` step cannot call the tool at all and Tool Routing legitimately
 * has nothing to measure. The suite reads this from the stack's own
 * `/api/agent_builder/skills` catalog (src/agent_builder_catalog.ts) so a stack
 * defect is reported as UNMEASURED instead of a 0.000 routing score.
 */
export const RULE_TUNING_INVESTIGATE_SKILL_ID = 'investigate-rule';

/**
 * Whether the eval stack under test is *supposed* to carry the investigate-rule
 * skill.
 *
 * `true` since the Scout config set for this suite now enables
 * `investigateRuleSkill` (classic.stateful.config.ts in
 * kbn-scout's evals_detection_watch_rule_tuning set): the suite fails loudly
 * when the catalog does not carry the skill (src/agent_builder_catalog.ts)
 * instead of silently reporting UNMEASURED.
 */
export const INVESTIGATE_RULE_SKILL_EXPECTED_IN_EVAL_STACK = true;

/**
 * Alerts index the suite seeds into and the worker's harvest step reads.
 *
 * A single hidden index behind this alias, created by the alerting framework
 * when the security solution bootstraps its rule-data namespace. Seeding into
 * the name before that happens makes ES auto-create a plain, dynamically-mapped
 * index instead — see src/alerts_index.ts.
 */
export const ALERTS_INDEX = '.alerts-security.alerts-default';

/**
 * Field whose presence proves the alerts index carries the unified-alerts
 * mapping rather than a dynamic one. An ES|QL query naming an unmapped column
 * fails with `verification_exception: Unknown column [kibana.alert.workflow_tags]`,
 * which is how the seed/security-solution race surfaces in the harvest step.
 */
export const ALERTS_WORKFLOW_TAGS_FIELD = 'kibana.alert.workflow_tags';

/** `POST` this to have the security solution install/refresh the alerts index. */
export const DETECTION_ENGINE_INDEX_API_PATH = '/api/detection_engine/index';

/**
 * Step id of the worker's `workflow.output` step
 * (`kbn-workflows/managed/definitions/alertzero/rule_tuning_worker.yaml`). Its
 * step execution carries the emitted `harvest_failed` / `reviews_requested`
 * counters — the only place a *failed* harvest is distinguishable from a sweep
 * that found nothing to tune.
 */
export const WORKER_OUTPUT_STEP_ID = 'emit_result';

/**
 * The worker's harvest step (`elasticsearch.esql.query`). It runs with
 * `on-failure: continue`, so a query failure leaves the sweep `completed` with
 * `reviews_requested: 0` — see `assertHarvestSucceeded` in src/workflow_task.ts.
 */
export const WORKER_HARVEST_STEP_ID = 'harvest_fp_alerts_by_rule';

/** Advanced setting that decides which connector the workflows' agents resolve. */
export const GEN_AI_DEFAULT_CONNECTOR_SETTING = 'genAiSettings:defaultAIConnector';
