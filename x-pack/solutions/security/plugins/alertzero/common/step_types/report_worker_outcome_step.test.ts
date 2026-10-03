/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import {
  AD_WORKER_ANALYSIS_VERDICTS,
  AD_WORKER_HANDOFF_OUTCOMES,
  AD_WORKER_RUN_OUTCOMES,
  ALERT_TRIAGE_CLOSURE_OUTCOMES,
  ENDPOINT_ANALYSIS_OUTCOMES,
  HUNT_REPORT_HUNT_STATUSES,
  HUNT_REPORT_MINT_SUPPRESSIONS,
  HUNT_REPORT_PACKAGE_STATUSES,
  INVESTIGATION_CLOSE_REASONS,
  RULE_COVERAGE_PROPOSAL_KINDS,
  RULE_COVERAGE_VERDICTS,
  RULE_TUNING_CHANGE_TYPES,
  RULE_TUNING_ENTRY_GATES,
  WORKER_DEGRADED_REASONS,
  WORKER_RECOMMENDATION_CONFIDENCES,
  WORKER_REVIEW_DECISIONS,
  WORKER_RUN_OUTCOMES,
} from '../telemetry/constants';
import type { ReportWorkerOutcomeEvent } from './report_worker_outcome_step';
import {
  MAX_REPORTED_COUNT,
  REPORT_WORKER_OUTCOME_EVENTS,
  ReportWorkerOutcomeStepId,
  reportWorkerOutcomeStepCommonDefinition,
  reportWorkerOutcomeStepInputSchema,
  reportWorkerOutcomeStepOutputSchema,
} from './report_worker_outcome_step';

const INVESTIGATION_ID = '0b9f4a3e-1c2d-8e3f-8a4b-5c6d7e8f9a0b';

/** A UUID v5, as the Hunt Worker mints for its Investigations. */
const UUID_V5_INVESTIGATION_ID = '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b';

type Override = Readonly<Record<string, unknown>>;

/**
 * The fields of a valid payload per event, without `event`. The complete payloads parse unchanged;
 * the three `ad_worker_review_started`, `ad_worker_analysis_completed` and
 * `ad_worker_handoff_resolved` entries are the minimal inputs their cases build on.
 */
const VALID_FIELDS: Readonly<Record<ReportWorkerOutcomeEvent, Override>> = {
  ad_worker_analysis_completed: { verdict: 'false_positive' },
  ad_worker_handoff_resolved: { outcome: 'approved' },
  ad_worker_review_started: {},
  ad_worker_run_completed: {
    alerts_analyzed: 120,
    attacks_generated: 4,
    attacks_persisted: 3,
    batches_failed: 1,
    batches_total: 6,
    run_outcome: 'produced',
  },
  alert_triage_batch_classified: {
    alerts_total: 40,
    alerts_without_verdict: 2,
    fp_below_floor: 3,
    fp_candidates: 20,
    investigation_id: INVESTIGATION_ID,
    verdicts_false_positive: 23,
    verdicts_inconclusive: 5,
    verdicts_true_positive: 10,
  },
  alert_triage_closure_resolved: {
    alerts_proposed: 20,
    alerts_retag_failed: 0,
    auto_approve_requested: false,
    investigation_id: INVESTIGATION_ID,
    outcome: 'dismissed',
    proposal_read_failed: false,
  },
  endpoint_analysis_completed: {
    actions_recommended: 2,
    agent_failed: false,
    analysis_outcome: 'processed',
    auto_approve_requested: false,
    findings_attached: true,
    host_resolved: true,
    iocs_found: true,
    proposals_dispatch_failed: 0,
    proposals_dispatched: 2,
    reused_prior_assessment: false,
    timeline_found: true,
  },
  hunt_report_completed: {
    closed_clean: false,
    coverage_kis_skipped: 1,
    coverage_kis_written: 2,
    has_confirmed_hit: true,
    hunt_status: 'success',
    investigation_id: UUID_V5_INVESTIGATION_ID,
    mint_suppression: 'none',
    package_status: 'success',
    proposals_dispatch_failed: 0,
    proposals_prepared: 3,
    tier2_invoked: true,
  },
  rule_coverage_review_completed: {
    applied: false,
    approved_not_applied: false,
    check_failed: false,
    creation_failed: false,
    creation_skipped: false,
    decision: 'approved',
    investigation_id: INVESTIGATION_ID,
    ki_processed: true,
    proposal_kind: 'create_rule',
    rule_created: true,
    rule_source: 'custom',
    rule_type: 'esql',
    verdict: 'no_coverage',
  },
  rule_tuning_review_completed: {
    applied: true,
    backtest_ran: true,
    backtest_reduced_alerts: true,
    change_type: 'query',
    confidence: 'high',
    decision: 'approved',
    entry_gate: 'skipped',
    investigation_id: INVESTIGATION_ID,
    rule_source: 'prebuilt',
    rule_type: 'query',
    rule_unavailable: false,
  },
  worker_investigation_closed: {
    close_reason: 'false_positive',
    investigation_id: INVESTIGATION_ID,
  },
  worker_run_completed: {
    candidates_found: 12,
    degraded_reason: 'dependency_unavailable',
    items_dispatched: 5,
    items_failed: 1,
    items_in_flight: 3,
    lookup_failed: true,
    run_outcome: 'degraded_partial',
    source_read_failed: false,
  },
};

/** The valid payload for `event`, with `override` applied on top (which may replace `event`). */
const inputFor = (event: ReportWorkerOutcomeEvent, override: Override = {}): Override => ({
  event,
  ...VALID_FIELDS[event],
  ...override,
});

const parse = (input: unknown) => reportWorkerOutcomeStepInputSchema.safeParse(input);

/** The parsed `ad_worker_review_started` branch, or undefined when the input did not parse to it. */
const parseReviewStarted = (input: Record<string, unknown>) => {
  const result = parse({ event: 'ad_worker_review_started', ...input });
  return result.success && result.data.event === 'ad_worker_review_started'
    ? result.data
    : undefined;
};

describe('alertzero.reportWorkerOutcome common definition', () => {
  it('uses the alertzero step id', () => {
    expect(reportWorkerOutcomeStepCommonDefinition.id).toBe('alertzero.reportWorkerOutcome');
  });

  it('exports the step id constant', () => {
    expect(ReportWorkerOutcomeStepId).toBe(reportWorkerOutcomeStepCommonDefinition.id);
  });

  it('is a beta Kibana step', () => {
    expect({
      category: reportWorkerOutcomeStepCommonDefinition.category,
      stability: reportWorkerOutcomeStepCommonDefinition.stability,
    }).toEqual({ category: StepCategory.Kibana, stability: 'beta' });
  });

  it('documents at least one example', () => {
    expect(reportWorkerOutcomeStepCommonDefinition.documentation?.examples?.length).toBeGreaterThan(
      0
    );
  });

  it('covers the Attack Discovery events, the two Worker-generic events and each Worker item event', () => {
    expect(REPORT_WORKER_OUTCOME_EVENTS).toEqual([
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
    ]);
  });

  it('outputs only `reported`', () => {
    expect(Object.keys(reportWorkerOutcomeStepOutputSchema.shape)).toEqual(['reported']);
  });
});

describe('alertzero.reportWorkerOutcome input schema', () => {
  it.each<ReportWorkerOutcomeEvent>([
    'ad_worker_run_completed',
    'worker_investigation_closed',
    'worker_run_completed',
    'alert_triage_batch_classified',
    'alert_triage_closure_resolved',
    'rule_tuning_review_completed',
    'rule_coverage_review_completed',
    'hunt_report_completed',
    'endpoint_analysis_completed',
  ])('parses a complete %s payload unchanged', (event) => {
    const input = inputFor(event);

    expect(parse(input)).toEqual({ data: input, success: true });
  });

  it.each<[ReportWorkerOutcomeEvent, string, readonly string[]]>([
    ['ad_worker_run_completed', 'run_outcome', AD_WORKER_RUN_OUTCOMES],
    ['ad_worker_analysis_completed', 'verdict', AD_WORKER_ANALYSIS_VERDICTS],
    ['ad_worker_handoff_resolved', 'outcome', AD_WORKER_HANDOFF_OUTCOMES],
    ['worker_investigation_closed', 'close_reason', INVESTIGATION_CLOSE_REASONS],
    ['worker_run_completed', 'run_outcome', WORKER_RUN_OUTCOMES],
    ['worker_run_completed', 'degraded_reason', WORKER_DEGRADED_REASONS],
    ['alert_triage_closure_resolved', 'outcome', ALERT_TRIAGE_CLOSURE_OUTCOMES],
    ['rule_tuning_review_completed', 'change_type', RULE_TUNING_CHANGE_TYPES],
    ['rule_tuning_review_completed', 'confidence', WORKER_RECOMMENDATION_CONFIDENCES],
    ['rule_tuning_review_completed', 'decision', WORKER_REVIEW_DECISIONS],
    ['rule_tuning_review_completed', 'entry_gate', RULE_TUNING_ENTRY_GATES],
    ['rule_coverage_review_completed', 'proposal_kind', RULE_COVERAGE_PROPOSAL_KINDS],
    ['rule_coverage_review_completed', 'verdict', RULE_COVERAGE_VERDICTS],
    ['hunt_report_completed', 'hunt_status', HUNT_REPORT_HUNT_STATUSES],
    ['hunt_report_completed', 'mint_suppression', HUNT_REPORT_MINT_SUPPRESSIONS],
    ['hunt_report_completed', 'package_status', HUNT_REPORT_PACKAGE_STATUSES],
    ['endpoint_analysis_completed', 'analysis_outcome', ENDPOINT_ANALYSIS_OUTCOMES],
  ])('%s accepts every %s', (event, field, values) => {
    const rejected = values.filter((value) => !parse(inputFor(event, { [field]: value })).success);

    expect(rejected).toEqual([]);
  });

  it.each<[ReportWorkerOutcomeEvent, string, Override]>([
    [
      'ad_worker_handoff_resolved',
      'auto_approve_requested',
      { auto_approve_requested: true, verdict: 'true_positive' },
    ],
    [
      'worker_investigation_closed',
      'a UUID v5 Investigation id, as the Hunt Worker mints',
      { investigation_id: UUID_V5_INVESTIGATION_ID },
    ],
  ])('%s accepts %s', (event, _label, override) => {
    expect(parse(inputFor(event, override)).success).toBe(true);
  });

  it.each<[ReportWorkerOutcomeEvent, string, Override, Override]>([
    [
      'ad_worker_run_completed',
      'defaults a count Liquid rendered as the empty string to 0',
      { batches_failed: '' },
      { batches_failed: 0 },
    ],
    [
      'ad_worker_run_completed',
      'coerces a count Liquid rendered as an integer string',
      { attacks_generated: '4' },
      { attacks_generated: 4 },
    ],
    [
      'ad_worker_analysis_completed',
      'defaults an empty analysis_error to false',
      { analysis_error: '' },
      { analysis_error: false },
    ],
    [
      'ad_worker_analysis_completed',
      'coerces analysis_error Liquid rendered as text',
      { analysis_error: 'true', verdict: 'failed' },
      { analysis_error: true },
    ],
    [
      'ad_worker_handoff_resolved',
      'treats an empty verdict as absent',
      { verdict: '' },
      { verdict: undefined },
    ],
    [
      'worker_run_completed',
      'treats a degraded reason Liquid rendered as the empty string as none',
      { degraded_reason: '' },
      { degraded_reason: 'none' },
    ],
    [
      'worker_run_completed',
      'coerces counts and flags Liquid rendered as text',
      { items_dispatched: '7', source_read_failed: 'true' },
      { items_dispatched: 7, source_read_failed: true },
    ],
    [
      'alert_triage_batch_classified',
      'treats an empty investigation id as absent',
      { investigation_id: '' },
      { investigation_id: undefined },
    ],
    [
      'rule_tuning_review_completed',
      'treats a confidence Liquid rendered as the empty string as none',
      { confidence: '' },
      { confidence: 'none' },
    ],
    [
      'hunt_report_completed',
      'leaves tier2_invoked absent when the Worker did not pass it',
      { tier2_invoked: '' },
      { tier2_invoked: undefined },
    ],
    [
      'hunt_report_completed',
      'defaults an empty mint suppression to none',
      { mint_suppression: '' },
      { mint_suppression: 'none' },
    ],
  ])('%s %s', (event, _label, override, expected) => {
    const result = parse(inputFor(event, override));

    expect(result.success && result.data).toEqual(expect.objectContaining(expected));
  });

  it('ad_worker_run_completed defaults an omitted count to 0', () => {
    const { alerts_analyzed: _omitted, ...withoutAlerts } = inputFor('ad_worker_run_completed');

    const result = parse(withoutAlerts);

    expect(result.success && result.data).toEqual(expect.objectContaining({ alerts_analyzed: 0 }));
  });

  it.each<[string, Override, Override]>([
    [
      'accepts an investigation id and a re-review flag',
      { investigation_id: INVESTIGATION_ID, is_rereview: true },
      { investigation_id: INVESTIGATION_ID, is_rereview: true },
    ],
    [
      'treats an empty investigation id as absent',
      { investigation_id: '' },
      { investigation_id: undefined },
    ],
    [
      'coerces a re-review flag Liquid rendered as text',
      { is_rereview: 'false' },
      { is_rereview: false },
    ],
    ['treats an empty re-review flag as absent', { is_rereview: '' }, { is_rereview: undefined }],
  ])('ad_worker_review_started %s', (_label, input, expected) => {
    expect(parseReviewStarted(input)).toEqual({ event: 'ad_worker_review_started', ...expected });
  });

  it('worker_run_completed defaults every count and flag, and the degraded reason to none, when only the outcome is given', () => {
    expect(parse({ event: 'worker_run_completed', run_outcome: 'empty_nothing_pending' })).toEqual({
      data: {
        candidates_found: 0,
        degraded_reason: 'none',
        event: 'worker_run_completed',
        items_dispatched: 0,
        items_failed: 0,
        items_in_flight: 0,
        lookup_failed: false,
        run_outcome: 'empty_nothing_pending',
        source_read_failed: false,
      },
      success: true,
    });
  });

  it.each<[ReportWorkerOutcomeEvent, string, Override]>([
    ['ad_worker_run_completed', 'a negative count', { alerts_analyzed: -1 }],
    ['ad_worker_run_completed', 'a fractional count', { alerts_analyzed: 1.5 }],
    [
      'ad_worker_run_completed',
      'a count above the bound',
      { alerts_analyzed: MAX_REPORTED_COUNT + 1 },
    ],
    ['ad_worker_run_completed', 'a non-numeric string', { alerts_analyzed: 'many' }],
    [
      'ad_worker_run_completed',
      'an unknown run outcome',
      { run_outcome: 'skipped_space_disabled' },
    ],
    ['ad_worker_run_completed', 'a missing run outcome', { run_outcome: '' }],
    [
      'ad_worker_review_started',
      'an investigation id that is not a UUID',
      { investigation_id: 'Suspicious login' },
    ],
    [
      'ad_worker_review_started',
      'an id the schema does not declare',
      { execution_id: INVESTIGATION_ID },
    ],
    ['ad_worker_analysis_completed', 'an unknown verdict', { verdict: 'maybe' }],
    [
      'ad_worker_analysis_completed',
      'a free-text field the schema does not declare',
      { summary: 'Lateral movement from fin-dc-01', verdict: 'true_positive' },
    ],
    ['ad_worker_handoff_resolved', 'an unknown outcome', { outcome: 'escalated' }],
    [
      'worker_investigation_closed',
      'a close reason outside the template vocabulary',
      { close_reason: 'declined' },
    ],
    [
      'worker_investigation_closed',
      'the Attack Discovery-only event name it replaced',
      { event: 'ad_worker_investigation_closed' },
    ],
    [
      'worker_investigation_closed',
      'a worker id, which comes from the run instead',
      { worker_id: 'system-security-hunt-continuous-threat-hunt' },
    ],
    ['worker_investigation_closed', 'a missing close reason', { close_reason: undefined }],
    ['worker_investigation_closed', 'an empty close reason', { close_reason: '' }],
    ['worker_investigation_closed', 'a missing investigation id', { investigation_id: undefined }],
    ['worker_investigation_closed', 'an empty investigation id', { investigation_id: '' }],
    [
      'worker_investigation_closed',
      'an investigation id that is not a UUID',
      { investigation_id: 'Suspicious login' },
    ],
    [
      'worker_investigation_closed',
      'the verdict prose the close writes',
      { verdict: 'Closed without escalation.' },
    ],
    ['worker_investigation_closed', 'a status', { status: 'closed' }],
    ['worker_investigation_closed', 'an analyst name', { decided_by: 'jdoe' }],
    ['worker_run_completed', 'an unknown run outcome', { run_outcome: 'skipped' }],
    ['worker_run_completed', 'a missing run outcome', { run_outcome: '' }],
    [
      'worker_run_completed',
      'an unknown degraded reason',
      { degraded_reason: 'model timeout on host-01' },
    ],
    [
      'worker_run_completed',
      'a count above the bound',
      { candidates_found: MAX_REPORTED_COUNT + 1 },
    ],
    ['worker_run_completed', 'a worker id', { worker_id: 'system-security-floor-alert-triage' }],
    ['alert_triage_batch_classified', 'a negative count', { fp_candidates: -1 }],
    [
      'alert_triage_batch_classified',
      'an investigation id that is not a UUID',
      { investigation_id: 'Alert Triage - rule' },
    ],
    ['alert_triage_batch_classified', 'a rule name', { rule_name: 'Suspicious PowerShell' }],
    ['alert_triage_closure_resolved', 'an unknown outcome', { outcome: 'failed' }],
    ['alert_triage_closure_resolved', 'a dismiss reason', { dismiss_reason: 'risk_accepted' }],
    [
      'rule_tuning_review_completed',
      'a change type the model invented',
      { change_type: 'disable_rule' },
    ],
    [
      'rule_tuning_review_completed',
      'a proposed query',
      { proposed_query: 'process.name: "powershell.exe"' },
    ],
    ['rule_tuning_review_completed', 'a rule id', { rule_uuid: 'a1b2c3' }],
    [
      'rule_coverage_review_completed',
      'the free-text check error',
      { check_error: 'coverage_check produced no verdict' },
    ],
    [
      'rule_coverage_review_completed',
      'a created rule name',
      { created_rule_name: 'Credential dumping via LSASS' },
    ],
    ['rule_coverage_review_completed', 'an unknown verdict', { verdict: 'partially_covered' }],
    ['hunt_report_completed', 'a report id', { report_id: 'report-1' }],
    [
      'hunt_report_completed',
      'the packaging summary',
      { summary: 'Packaging prepared 3 proposals' },
    ],
    ['endpoint_analysis_completed', 'a host name', { host_name: 'fin-dc-01' }],
    [
      'endpoint_analysis_completed',
      'an action id',
      { action_id: 'system-alertzero-action-isolate-host' },
    ],
    ['endpoint_analysis_completed', 'an unknown outcome', { analysis_outcome: 'retired' }],
  ])('%s rejects %s', (event, _label, override) => {
    expect(parse(inputFor(event, override)).success).toBe(false);
  });

  it('rejects an event outside the union', () => {
    expect(parse({ event: 'rule_tuning_worker_run_completed' }).success).toBe(false);
  });

  it('converts to a JSON schema the YAML editor can use', () => {
    const jsonSchema = z.toJSONSchema(reportWorkerOutcomeStepInputSchema, {
      reused: 'ref',
      target: 'draft-7',
      unrepresentable: 'any',
    }) as { oneOf?: Array<{ properties: { event: { const: string } } }> };

    expect(jsonSchema.oneOf?.map(({ properties }) => properties.event.const)).toEqual([
      ...REPORT_WORKER_OUTCOME_EVENTS,
    ]);
  });
});
