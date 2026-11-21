/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml, parseDocument } from 'yaml';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import {
  INVESTIGATION_CLOSE_REASONS,
  RULE_REVIEW_ENTRY_GATES,
  WORKER_DEGRADED_REASONS,
  WORKER_RECOMMENDATION_CONFIDENCES,
  WORKER_REVIEW_DECISIONS,
  WORKER_RUN_OUTCOMES,
} from '../telemetry/constants';
import {
  ALERT_TRIAGE_CLOSURE_OUTCOMES,
  ALERT_TRIAGE_REPORTABLE_EVENTS,
} from '../telemetry/workers/alert_triage';
import { ALERT_TRIAGE_INPUT_FIXTURES } from '../telemetry/workers/alert_triage.fixture';
import {
  AD_WORKER_ANALYSIS_VERDICTS,
  AD_WORKER_HANDOFF_OUTCOMES,
  AD_WORKER_RUN_OUTCOMES,
  ATTACK_DISCOVERY_REPORTABLE_EVENTS,
} from '../telemetry/workers/attack_discovery';
import { ATTACK_DISCOVERY_INPUT_FIXTURES } from '../telemetry/workers/attack_discovery.fixture';
import {
  RULE_COVERAGE_PROPOSAL_KINDS,
  RULE_COVERAGE_VERDICTS,
  RULE_COVERAGE_REPORTABLE_EVENTS,
} from '../telemetry/workers/rule_coverage';
import { RULE_COVERAGE_INPUT_FIXTURES } from '../telemetry/workers/rule_coverage.fixture';
import {
  RULE_TUNING_CHANGE_TYPES,
  RULE_TUNING_REPORTABLE_EVENTS,
} from '../telemetry/workers/rule_tuning';
import { RULE_TUNING_INPUT_FIXTURES } from '../telemetry/workers/rule_tuning.fixture';
import {
  ENDPOINT_ANALYSIS_OUTCOMES,
  ENDPOINT_ANALYSIS_REPORTABLE_EVENTS,
} from '../telemetry/workers/endpoint_analysis';
import { ENDPOINT_ANALYSIS_INPUT_FIXTURES } from '../telemetry/workers/endpoint_analysis.fixture';
import {
  HUNT_REPORT_HUNT_STATUSES,
  HUNT_REPORT_MINT_SUPPRESSIONS,
  HUNT_REPORT_PACKAGE_STATUSES,
  CONTINUOUS_THREAT_HUNT_REPORTABLE_EVENTS,
} from '../telemetry/workers/continuous_threat_hunt';
import { CONTINUOUS_THREAT_HUNT_INPUT_FIXTURES } from '../telemetry/workers/continuous_threat_hunt.fixture';
import {
  INVESTIGATION_ID_FIXTURE,
  UUID_V5_INVESTIGATION_ID_FIXTURE,
} from '../telemetry/report_step_input_fields.fixture';
import type { ReportWorkerOutcomeEvent } from './report_worker_outcome_step';
import {
  ANY_WORKER_REPORTABLE_EVENTS,
  MAX_REPORTED_COUNT,
  REPORT_WORKER_OUTCOME_EVENTS,
  ReportWorkerOutcomeStepId,
  reportWorkerOutcomeStepCommonDefinition,
  reportWorkerOutcomeStepInputSchema,
  reportWorkerOutcomeStepOutputSchema,
} from './report_worker_outcome_step';

type Override = Readonly<Record<string, unknown>>;

const VALID_FIELDS: Readonly<Record<ReportWorkerOutcomeEvent, Override>> = {
  ...ATTACK_DISCOVERY_INPUT_FIXTURES,
  worker_investigation_closed: {
    close_reason: 'false_positive',
    investigation_id: INVESTIGATION_ID_FIXTURE,
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
  ...ALERT_TRIAGE_INPUT_FIXTURES,
  ...RULE_TUNING_INPUT_FIXTURES,
  ...RULE_COVERAGE_INPUT_FIXTURES,
  ...CONTINUOUS_THREAT_HUNT_INPUT_FIXTURES,
  ...ENDPOINT_ANALYSIS_INPUT_FIXTURES,
};

/** The valid payload for `event`, with `override` applied on top (which may replace `event`). */
const inputFor = (event: ReportWorkerOutcomeEvent, override: Override = {}): Override => ({
  event,
  ...VALID_FIELDS[event],
  ...override,
});

const parse = (input: unknown) => reportWorkerOutcomeStepInputSchema.safeParse(input);

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

  it('writes each example as a titled YAML block, as the editor renders Markdown', () => {
    expect(
      (reportWorkerOutcomeStepCommonDefinition.documentation?.examples ?? []).filter(
        (example) => !/^## .+\n```yaml\n[\s\S]+\n```$/.test(example)
      )
    ).toEqual([]);
  });

  describe('examples', () => {
    interface ExampleStep {
      name: string;
      'on-failure'?: { continue?: boolean };
      type: string;
      with: Record<string, unknown>;
    }

    const exampleYamls = (
      reportWorkerOutcomeStepCommonDefinition.documentation?.examples ?? []
    ).map((example) => example.replace(/^## .+\n```yaml\n/, '').replace(/\n```$/, ''));

    const parseSteps = (yaml: string): ExampleStep[] => {
      try {
        return parseYaml(yaml) as ExampleStep[];
      } catch {
        return [];
      }
    };

    const exampleSteps = exampleYamls.flatMap(parseSteps);

    it('parses each example as YAML, so a copied example works', () => {
      expect(
        exampleYamls.map((yaml) => parseDocument(yaml).errors.map(({ message }) => message))
      ).toEqual(exampleYamls.map(() => []));
    });

    const fieldsByEvent = new Map(
      (
        z.toJSONSchema(reportWorkerOutcomeStepInputSchema, {
          reused: 'ref',
          target: 'draft-7',
          unrepresentable: 'any',
        }) as { oneOf: Array<{ properties: Record<string, { const?: string }> }> }
      ).oneOf.map(({ properties }) => [properties.event.const, Object.keys(properties)])
    );

    /** The steps of the Attack Discovery runner (`attack_discovery_runner.yaml`) its reports read. */
    const RUNNER_STEPS = ['run_generation', 'resolve_fanout'];

    it("shows the Attack Discovery runner's two run reports", () => {
      expect(exampleSteps.map(({ name, with: { event } }) => [name, event])).toEqual([
        ['report_run_completed', 'ad_worker_run_completed'],
        ['report_worker_run_completed', 'worker_run_completed'],
      ]);
    });

    it('runs each report as telemetry only, with no timeout', () => {
      expect(
        exampleSteps.map((step) => ({
          continue: step['on-failure']?.continue,
          timeout: (step as { timeout?: string }).timeout,
          type: step.type,
        }))
      ).toEqual(
        exampleSteps.map(() => ({
          continue: true,
          timeout: undefined,
          type: ReportWorkerOutcomeStepId,
        }))
      );
    });

    it("sends only fields its event's input schema declares", () => {
      expect(
        exampleSteps.flatMap(({ with: fields }) =>
          Object.keys(fields).filter(
            (field) => !fieldsByEvent.get(String(fields.event))?.includes(field)
          )
        )
      ).toEqual([]);
    });

    it("reads only the runner's own steps", () => {
      const referenced = exampleSteps.flatMap(({ with: fields }) =>
        [...JSON.stringify(fields).matchAll(/steps\.([a-z_]+)\./g)].map(([, step]) => step)
      );

      expect(referenced.filter((step) => !RUNNER_STEPS.includes(step))).toEqual([]);
    });
  });

  it('declares each event for one Worker only', () => {
    const declared = [
      ATTACK_DISCOVERY_REPORTABLE_EVENTS,
      ANY_WORKER_REPORTABLE_EVENTS,
      ALERT_TRIAGE_REPORTABLE_EVENTS,
      RULE_TUNING_REPORTABLE_EVENTS,
      RULE_COVERAGE_REPORTABLE_EVENTS,
      CONTINUOUS_THREAT_HUNT_REPORTABLE_EVENTS,
      ENDPOINT_ANALYSIS_REPORTABLE_EVENTS,
    ].flatMap((events) => Object.keys(events));

    expect(declared.filter((event, index) => declared.indexOf(event) !== index)).toEqual([]);
    expect(REPORT_WORKER_OUTCOME_EVENTS).toHaveLength(declared.length);
  });

  it('outputs only `reported`', () => {
    expect(Object.keys(reportWorkerOutcomeStepOutputSchema.shape)).toEqual(['reported']);
  });
});

describe('alertzero.reportWorkerOutcome input schema', () => {
  // A batch has no Investigation of its own, so its classification report sends none.
  it.each([undefined, ''])(
    'accepts alert_triage_batch_classified with investigation_id %p',
    (id) => {
      const parsed = reportWorkerOutcomeStepInputSchema.safeParse({
        ...inputFor('alert_triage_batch_classified'),
        investigation_id: id,
      });

      expect(parsed.success).toBe(true);
    }
  );

  it.each(REPORT_WORKER_OUTCOME_EVENTS.filter((event) => event !== 'ad_worker_analysis_completed'))(
    'parses a complete %s payload unchanged',
    (event) => {
      const input = inputFor(event);

      expect(parse(input)).toEqual({ data: input, success: true });
    }
  );

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
    ['rule_tuning_review_completed', 'entry_gate', RULE_REVIEW_ENTRY_GATES],
    ['rule_coverage_review_completed', 'entry_gate', RULE_REVIEW_ENTRY_GATES],
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

  describe.each<ReportWorkerOutcomeEvent>([
    'rule_tuning_review_completed',
    'rule_coverage_review_completed',
  ])('%s rule_type', (event) => {
    // Worker YAML passes the rule's own `type`, so the vocabulary lives in one place.
    it.each([
      ['machine_learning', 'ml'],
      ['saved_query', 'query'],
      ['query', 'query'],
      ['eql', 'eql'],
      ['esql', 'esql'],
      ['threshold', 'threshold'],
      ['new_terms', 'new_terms'],
      ['threat_match', 'threat_match'],
      ['ml', 'ml'],
      ['a_rule_type_added_later', 'other'],
    ])('maps the rule type %s to %s', (ruleType, expected) => {
      expect(parse(inputFor(event, { rule_type: ruleType }))).toEqual({
        data: { ...inputFor(event), rule_type: expected },
        success: true,
      });
    });

    it('is absent when Liquid renders nothing', () => {
      const { rule_type: _ruleType, ...expected } = inputFor(event);

      expect(parse(inputFor(event, { rule_type: '' }))).toEqual({ data: expected, success: true });
    });
  });

  it('rule_tuning_review_completed defaults approved_not_applied to false', () => {
    const { approved_not_applied: _approvedNotApplied, ...input } = inputFor(
      'rule_tuning_review_completed'
    );

    expect(parse(input)).toEqual({
      data: { ...input, approved_not_applied: false },
      success: true,
    });
  });

  it('rule_coverage_review_completed requires entry_gate, which every coverage report renders', () => {
    const { entry_gate: _entryGate, ...input } = inputFor('rule_coverage_review_completed');

    expect(parse(input).success).toBe(false);
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
      { investigation_id: UUID_V5_INVESTIGATION_ID_FIXTURE },
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
      'ad_worker_review_started',
      'coerces a re-review flag Liquid rendered as text',
      { is_rereview: 'true' },
      { is_rereview: true },
    ],
    [
      'ad_worker_handoff_resolved',
      'coerces auto_approve_requested Liquid rendered as text',
      { auto_approve_requested: 'true' },
      { auto_approve_requested: true },
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
      'rule_tuning_review_completed',
      'treats an empty investigation id as absent',
      { investigation_id: '', rule_unavailable: true },
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
      { execution_id: INVESTIGATION_ID_FIXTURE },
    ],
    ['ad_worker_analysis_completed', 'an unknown verdict', { verdict: 'maybe' }],
    [
      'ad_worker_analysis_completed',
      'a free-text field the schema does not declare',
      { summary: 'Lateral movement from fin-dc-01', verdict: 'true_positive' },
    ],
    ['ad_worker_review_started', 'a missing investigation id', { investigation_id: undefined }],
    ['ad_worker_review_started', 'an empty investigation id', { investigation_id: '' }],
    ['ad_worker_review_started', 'a missing re-review flag', { is_rereview: undefined }],
    ['ad_worker_review_started', 'an empty re-review flag', { is_rereview: '' }],
    ['ad_worker_handoff_resolved', 'an unknown outcome', { outcome: 'escalated' }],
    ['ad_worker_handoff_resolved', 'a missing verdict', { verdict: undefined }],
    ['ad_worker_handoff_resolved', 'an empty verdict', { verdict: '' }],
    [
      'ad_worker_handoff_resolved',
      'a missing auto_approve_requested',
      { auto_approve_requested: undefined },
    ],
    [
      'ad_worker_handoff_resolved',
      'an empty auto_approve_requested',
      { auto_approve_requested: '' },
    ],
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
    ['alert_triage_batch_grouped', 'a negative count', { strict_keys: -1 }],
    ['alert_triage_batch_grouped', 'a rule id', { rule_id: 'abc' }],
    ['alert_triage_closure_resolved', 'an unknown outcome', { outcome: 'failed' }],
    [
      'alert_triage_closure_resolved',
      'a missing investigation id',
      { investigation_id: undefined },
    ],
    ['alert_triage_closure_resolved', 'an empty investigation id', { investigation_id: '' }],
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
