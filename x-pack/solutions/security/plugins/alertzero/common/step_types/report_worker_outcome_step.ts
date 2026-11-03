/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  AD_WORKER_ANALYSIS_VERDICTS,
  AD_WORKER_ESCALATED_VERDICTS,
  AD_WORKER_HANDOFF_OUTCOMES,
  AD_WORKER_RUN_OUTCOMES,
  ALERT_TRIAGE_CLOSURE_OUTCOMES,
  DETECTION_RULE_SOURCES,
  DETECTION_RULE_TYPES,
  ENDPOINT_ANALYSIS_OUTCOMES,
  HUNT_REPORT_HUNT_STATUSES,
  HUNT_REPORT_MINT_SUPPRESSIONS,
  HUNT_REPORT_PACKAGE_STATUSES,
  INVESTIGATION_CLOSE_REASONS,
  RULE_COVERAGE_PROPOSAL_KINDS,
  RULE_COVERAGE_VERDICTS,
  RULE_REVIEW_ENTRY_GATES,
  RULE_TUNING_CHANGE_TYPES,
  WORKER_DEGRADED_REASONS,
  WORKER_RECOMMENDATION_CONFIDENCES,
  WORKER_REVIEW_DECISIONS,
  WORKER_RUN_OUTCOMES,
} from '../telemetry/constants';
import { toDetectionRuleType } from '../telemetry/to_detection_rule_type';

export const ReportWorkerOutcomeStepId = 'alertzero.reportWorkerOutcome' as const;

/**
 * The Worker outcome events the step can report; each maps to `alertzero_<event>`. Any catalogued
 * Worker can report `worker_run_completed` and `worker_investigation_closed`; every other event
 * belongs to one Worker (the four `ad_worker_*` events to the Attack Discovery Worker), and the
 * server step reports it only from that Worker's own run.
 */
export const REPORT_WORKER_OUTCOME_EVENTS = [
  'ad_worker_run_completed',
  'ad_worker_review_started',
  'ad_worker_analysis_completed',
  'ad_worker_handoff_resolved',
  'worker_investigation_closed',
  'worker_run_completed',
  'alert_triage_batch_classified',
  'alert_triage_closure_resolved',
  'rule_tuning_review_completed',
  'rule_coverage_review_completed',
  'hunt_report_completed',
  'endpoint_analysis_completed',
] as const;

export type ReportWorkerOutcomeEvent = (typeof REPORT_WORKER_OUTCOME_EVENTS)[number];

/** Upper bound for every reported count, far above any real Worker run. */
export const MAX_REPORTED_COUNT = 1_000_000;

const INTEGER_STRING = /^\d+$/;

/** Liquid renders a missing value as `''`; treat it (and `null`) as absent. */
const toAbsent = (value: unknown): unknown => (value === '' || value === null ? undefined : value);

/** Also accepts the integer text a `{{ }}` template renders. */
const toCount = (value: unknown): unknown => {
  const present = toAbsent(value);
  return typeof present === 'string' && INTEGER_STRING.test(present) ? Number(present) : present;
};

/** Also accepts the `true` / `false` text a `{{ }}` template renders. */
const toFlag = (value: unknown): unknown => {
  const present = toAbsent(value);
  if (present === 'true') {
    return true;
  }
  if (present === 'false') {
    return false;
  }
  return present;
};

const count = (description: string) =>
  z
    .preprocess(toCount, z.number().int().min(0).max(MAX_REPORTED_COUNT).default(0))
    .describe(description);

const flag = (description: string) =>
  z.preprocess(toFlag, z.boolean().default(false)).describe(description);

/** A flag Worker YAML always renders, so an empty value fails instead of defaulting. */
const requiredFlag = (description: string) =>
  z.preprocess(toFlag, z.boolean()).describe(description);

const optionalFlag = (description: string) =>
  z.preprocess(toFlag, z.boolean().optional()).describe(description);

/** A required closed vocabulary value, which Worker YAML always renders. */
const oneOf = <T extends readonly [string, ...string[]]>(values: T, description: string) =>
  z.enum(values).describe(description);

/** A closed vocabulary value that falls back to `fallback` when Liquid renders nothing. */
const oneOfOrDefault = <T extends readonly [string, ...string[]]>(
  values: T,
  fallback: T[number],
  description: string
) => z.preprocess(toAbsent, z.enum(values).default(fallback)).describe(description);

/** A closed vocabulary value, absent when Liquid renders nothing. */
const optionalOneOf = <T extends readonly [string, ...string[]]>(values: T, description: string) =>
  z.preprocess(toAbsent, z.enum(values).optional()).describe(description);

/**
 * A detection rule's own `type`, mapped to the #19891 vocabulary here so Worker YAML passes it
 * through; absent when Liquid renders nothing.
 */
const detectionRuleType = (description: string) =>
  z.preprocess(toDetectionRuleType, z.enum(DETECTION_RULE_TYPES).optional()).describe(description);

/** The Worker's own Investigation, which every step reporting the event has. */
const investigationId = (description: string) =>
  z.preprocess(toAbsent, z.uuid()).describe(description);

/**
 * The Worker's own Investigation, absent only in the one case the event names; the server step
 * rejects any other absence (`find_outcome_contradictions.ts`).
 */
const optionalInvestigationId = (description: string) =>
  z.preprocess(toAbsent, z.uuid().optional()).describe(description);

const adWorkerRunCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('ad_worker_run_completed'),
    alerts_analyzed: count('Alerts the run analyzed'),
    attacks_generated: count('Attacks the run generated, before de-duplication'),
    attacks_persisted: count('Attacks the run persisted'),
    batches_failed: count('Generation batches that failed'),
    batches_total: count('Generation batches the run attempted'),
    run_outcome: z.enum(AD_WORKER_RUN_OUTCOMES).describe('How the run ended'),
  })
);

const adWorkerReviewStartedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('ad_worker_review_started'),
    investigation_id: investigationId('Investigation the review opened or reused'),
    is_rereview: requiredFlag('Whether the attack already had an Investigation'),
  })
);

const adWorkerAnalysisCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('ad_worker_analysis_completed'),
    analysis_error: flag('Whether the FP/TP analysis failed or timed out'),
    verdict: z.enum(AD_WORKER_ANALYSIS_VERDICTS).describe('FP/TP analysis verdict'),
  })
);

const adWorkerHandoffResolvedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('ad_worker_handoff_resolved'),
    auto_approve_requested: requiredFlag('Whether the review asked the gate to auto-approve'),
    outcome: z.enum(AD_WORKER_HANDOFF_OUTCOMES).describe('How the escalation gate resolved'),
    verdict: oneOf(
      AD_WORKER_ESCALATED_VERDICTS,
      'FP/TP analysis verdict that led to the escalation'
    ),
  })
);

const workerInvestigationClosedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('worker_investigation_closed'),
    close_reason: z
      .enum(INVESTIGATION_CLOSE_REASONS)
      .describe('Investigation template close reason the Worker wrote'),
    investigation_id: z.preprocess(toAbsent, z.uuid()).describe('Investigation the Worker closed'),
  })
);

const workerRunCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('worker_run_completed'),
    candidates_found: count('Work items the run found to work on'),
    degraded_reason: oneOfOrDefault(
      WORKER_DEGRADED_REASONS,
      'none',
      'Main reason the run did less than the work it found; none when it did all of it'
    ),
    items_dispatched: count('Work items the run started or handed on'),
    items_failed: count('Work items that failed or could not be started'),
    items_in_flight: count('Work items still in progress that the run did not wait for'),
    lookup_failed: flag('Whether a secondary lookup failed and the run carried on without it'),
    run_outcome: oneOf(WORKER_RUN_OUTCOMES, 'How the run ended'),
    source_read_failed: flag('Whether reading the source of work items failed'),
  })
);

const alertTriageBatchClassifiedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('alert_triage_batch_classified'),
    alerts_total: count('Alerts in the batch'),
    alerts_without_verdict: count('Alerts the analysis returned no verdict for'),
    fp_below_floor: count('False positives below the confidence floor, which are not proposed'),
    fp_candidates: count('False positives at or above the confidence floor'),
    investigation_id: investigationId('Investigation the Worker opened for the batch'),
    verdicts_false_positive: count('Alerts classified as false positives'),
    verdicts_inconclusive: count('Alerts classified as inconclusive'),
    verdicts_true_positive: count('Alerts classified as true positives'),
  })
);

const alertTriageClosureResolvedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('alert_triage_closure_resolved'),
    alerts_proposed: count('Alerts the closure proposal covered'),
    alerts_retag_failed: count('Alerts a dismissal could not re-tag'),
    auto_approve_requested: requiredFlag('Whether the review asked the gate to auto-approve'),
    investigation_id: investigationId('Investigation the closure review settles'),
    outcome: oneOf(ALERT_TRIAGE_CLOSURE_OUTCOMES, 'How the closure proposal settled'),
    proposal_read_failed: flag('Whether the decided proposal could not be read back'),
  })
);

const ruleTuningReviewCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('rule_tuning_review_completed'),
    applied: flag('Whether an approved tuning change landed on the rule'),
    approved_not_applied: flag('Whether an approved tuning change did not land'),
    backtest_ran: flag('Whether both backtest previews succeeded'),
    backtest_reduced_alerts: flag('Whether the proposed rule produced fewer preview alerts'),
    change_type: oneOf(RULE_TUNING_CHANGE_TYPES, 'Kind of tuning change proposed'),
    confidence: oneOfOrDefault(
      WORKER_RECOMMENDATION_CONFIDENCES,
      'none',
      "The diagnosis's stated confidence"
    ),
    decision: oneOf(WORKER_REVIEW_DECISIONS, 'What the tuning proposal came to'),
    entry_gate: oneOf(RULE_REVIEW_ENTRY_GATES, 'How the manual-autonomy entry gate went'),
    investigation_id: optionalInvestigationId(
      'Investigation the review opened; absent only when rule_unavailable'
    ),
    rule_source: optionalOneOf(DETECTION_RULE_SOURCES, 'Whether the reviewed rule is prebuilt'),
    rule_type: detectionRuleType("The reviewed rule's type"),
    rule_unavailable: flag('Whether the rule could not be read or was disabled'),
  })
);

const ruleCoverageReviewCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('rule_coverage_review_completed'),
    applied: flag('Whether an approved enable or install landed on the rule'),
    approved_not_applied: flag('Whether an approved enable or install did not land'),
    check_failed: flag('Whether the indicator was missing or the check gave no verdict'),
    creation_failed: flag('Whether the rule-creation run failed'),
    creation_skipped: flag('Whether the rule-creation run proposed nothing'),
    decision: oneOf(WORKER_REVIEW_DECISIONS, 'What the coverage proposal came to'),
    entry_gate: oneOf(RULE_REVIEW_ENTRY_GATES, 'How the manual-autonomy entry gate went'),
    investigation_id: optionalInvestigationId(
      'Investigation the review opened; absent only when check_failed'
    ),
    ki_processed: flag('Whether the indicator was marked processed'),
    proposal_kind: oneOf(RULE_COVERAGE_PROPOSAL_KINDS, 'What the review proposed'),
    rule_created: flag('Whether a new rule was created'),
    rule_source: optionalOneOf(
      DETECTION_RULE_SOURCES,
      'Whether the rule the review is about is prebuilt'
    ),
    rule_type: detectionRuleType('The type of the rule the review is about'),
    verdict: oneOf(RULE_COVERAGE_VERDICTS, "The coverage check's verdict"),
  })
);

const huntReportCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('hunt_report_completed'),
    closed_clean: flag('Whether a clean run closed the Investigation as benign'),
    coverage_kis_skipped: count('Coverage knowledge items packaging did not write'),
    coverage_kis_written: count('Coverage knowledge items packaging wrote for Detection Watch'),
    has_confirmed_hit: flag('Whether the hunt cleared the confirmed-hit bar'),
    hunt_status: oneOf(HUNT_REPORT_HUNT_STATUSES, "The hunt child's result status"),
    investigation_id: optionalInvestigationId(
      "The report's Investigation; absent only when package_status is run_incomplete"
    ),
    mint_suppression: oneOfOrDefault(
      HUNT_REPORT_MINT_SUPPRESSIONS,
      'none',
      'Why packaging held back its Proposals'
    ),
    package_status: oneOf(HUNT_REPORT_PACKAGE_STATUSES, "Packaging's own status"),
    proposals_dispatch_failed: count('Proposal gates that failed to launch'),
    proposals_prepared: count('Proposals packaging prepared and launched a gate for'),
    tier2_invoked: optionalFlag('Whether the hunt ran Tier 2'),
  })
);

const endpointAnalysisCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('endpoint_analysis_completed'),
    actions_recommended: count('Containment actions the analysis recommended'),
    agent_failed: flag('Whether the forensic agent failed'),
    analysis_outcome: oneOf(ENDPOINT_ANALYSIS_OUTCOMES, 'How the run settled its indicator'),
    auto_approve_requested: requiredFlag('Whether the proposals asked the gate to auto-approve'),
    findings_attached: flag('Whether the timeline and IoC findings are on the Investigation'),
    host_resolved: flag('Whether a host was found to analyze'),
    iocs_found: flag('Whether the analysis extracted any IoC'),
    proposals_dispatch_failed: count('Containment proposals that did not reach the queue'),
    proposals_dispatched: count('Containment proposals dispatched'),
    reused_prior_assessment: flag("Whether an earlier run's findings were reused"),
    timeline_found: flag('Whether the analysis reconstructed any timeline event'),
  })
);

/**
 * A closed union of the Worker outcomes: enums, bounded counts and flags only, so a Worker YAML
 * cannot ship free text or ids other than its own Investigation id.
 */
export const reportWorkerOutcomeStepInputSchema = lazySchema(() =>
  z.discriminatedUnion('event', [
    adWorkerRunCompletedInputSchema,
    adWorkerReviewStartedInputSchema,
    adWorkerAnalysisCompletedInputSchema,
    adWorkerHandoffResolvedInputSchema,
    workerInvestigationClosedInputSchema,
    workerRunCompletedInputSchema,
    alertTriageBatchClassifiedInputSchema,
    alertTriageClosureResolvedInputSchema,
    ruleTuningReviewCompletedInputSchema,
    ruleCoverageReviewCompletedInputSchema,
    huntReportCompletedInputSchema,
    endpointAnalysisCompletedInputSchema,
  ])
);

export type ReportWorkerOutcomeStepInput = z.output<typeof reportWorkerOutcomeStepInputSchema>;

export const reportWorkerOutcomeStepOutputSchema = lazySchema(() =>
  z.object({
    reported: z.boolean().describe('Whether the outcome event was reported'),
  })
);

export const reportWorkerOutcomeStepCommonDefinition: CommonStepDefinition<
  typeof reportWorkerOutcomeStepInputSchema,
  typeof reportWorkerOutcomeStepOutputSchema
> = {
  id: ReportWorkerOutcomeStepId,
  label: i18n.translate('xpack.alertzero.workflows.steps.reportWorkerOutcome.label', {
    defaultMessage: 'Report AlertZero Worker outcome',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.reportWorkerOutcome.description', {
    defaultMessage:
      'Reports an allowlisted AlertZero Worker outcome as product telemetry. Only a managed AlertZero Worker run reports; any other caller is skipped.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: reportWorkerOutcomeStepInputSchema,
  outputSchema: reportWorkerOutcomeStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.alertzero.workflows.steps.reportWorkerOutcome.documentation.details',
      {
        defaultMessage:
          'The step never fails the workflow. It returns reported: false when the run is a test run, is not part of a managed AlertZero Worker run, the input does not match the event schema, or telemetry could not be reported. Run with on-failure continue and no timeout: the step stops itself after 20 seconds.',
      }
    ),
    examples: [
      `## Report an Attack Discovery Worker run
\`\`\`yaml
# Telemetry: once every batch has dispatched, before \`emit_result\` ends the run.
- name: report_run_completed
  type: ${ReportWorkerOutcomeStepId}
  on-failure:
    continue: true
  with:
    event: ad_worker_run_completed
    alerts_analyzed: "\${{ steps.run_generation.output.alerts_analyzed | default: 0 }}"
    batches_total: "\${{ steps.run_generation.output.batches_total | default: 0 }}"
    batches_failed: "\${{ steps.run_generation.output.batches_failed | default: 0 }}"
    attacks_generated: "\${{ steps.run_generation.output.discoveries_generated | default: 0 }}"
    attacks_persisted: "\${{ steps.resolve_fanout.output.attack_count | default: 0 }}"
    run_outcome: |-
      {%- assign batches_total = steps.run_generation.output.batches_total | default: 0 -%}
      {%- assign batches_failed = steps.run_generation.output.batches_failed | default: 0 -%}
      {%- assign generated = steps.run_generation.output.discoveries_generated | default: 0 -%}
      {%- assign persisted = steps.resolve_fanout.output.attack_count | default: 0 -%}
      {%- if batches_total == 0 -%}
      empty_no_alerts
      {%- elsif batches_failed >= batches_total -%}
      failed_all_batches
      {%- elsif batches_failed > 0 -%}
      degraded_partial
      {%- elsif persisted > 0 -%}
      produced
      {%- elsif generated > 0 -%}
      empty_all_duplicates
      {%- else -%}
      empty_no_attacks
      {%- endif -%}
\`\`\``,
      `## Report the same run with the event every Worker shares
\`\`\`yaml
# The same run in the vocabulary every Worker shares. The items are generation batches, which the
# run waits for, so none is in flight; alerts and attacks are on its own event.
- name: report_worker_run_completed
  type: ${ReportWorkerOutcomeStepId}
  on-failure:
    continue: true
  with:
    event: worker_run_completed
    candidates_found: "\${{ steps.run_generation.output.batches_total | default: 0 }}"
    items_dispatched: "\${{ steps.run_generation.output.batches_total | default: 0 }}"
    items_failed: "\${{ steps.run_generation.output.batches_failed | default: 0 }}"
    items_in_flight: 0
    degraded_reason: "{% if steps.run_generation.output.batches_failed > 0 %}dependency_unavailable{% else %}none{% endif %}"
    run_outcome: |-
      {%- assign batches_total = steps.run_generation.output.batches_total | default: 0 -%}
      {%- assign batches_failed = steps.run_generation.output.batches_failed | default: 0 -%}
      {%- assign persisted = steps.resolve_fanout.output.attack_count | default: 0 -%}
      {%- if batches_total == 0 -%}
      empty_nothing_pending
      {%- elsif batches_failed >= batches_total -%}
      failed_all_items
      {%- elsif batches_failed > 0 -%}
      degraded_partial
      {%- elsif persisted > 0 -%}
      produced
      {%- else -%}
      empty_nothing_found
      {%- endif -%}
\`\`\``,
    ],
  },
};
