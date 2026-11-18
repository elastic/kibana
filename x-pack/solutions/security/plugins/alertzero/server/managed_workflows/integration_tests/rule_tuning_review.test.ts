/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runs the shipped rule tuning review through the real workflow engine.
 *
 * Each case gives the answers of the boundaries the workflow does not own (the
 * agent, the human at each proposal gate, the rule API) and the ending it
 * expects. The engine, the YAML, its templates and its branches are real.
 */

import {
  ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID,
  ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
  ALERTZERO_RULE_PREVIEW_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  describeBranchCoverage,
  managedWorkflow,
  matchesStepSchema,
  runManagedWorkflow,
  stepSchema,
  type KibanaApiResponse,
  type ManagedWorkflowRun,
  type RunEnd,
} from '@kbn/workflows-execution-engine/test_helpers';
import {
  INVESTIGATION_STEP_FAKES,
  PROPOSAL_WORKFLOW_ID,
  actionInputErrors,
  caseRun,
  childInputErrors,
  declaredOutputs,
  investigationState,
  proposalInputs,
  proposalStepNames,
  proposalSteps,
  proposalWorkflowFake,
  schemaFieldValues,
  succeededStepInputs,
  triggerInputValues,
  undeclaredGateOutputs,
  unexpectedValues,
  valuesWithoutCase,
  type GateAnswers,
  type InvestigationState,
} from './alertzero_workflow_fakes';

const WORKFLOW = managedWorkflow(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID);
const PREVIEW_WORKFLOW_ID = ALERTZERO_RULE_PREVIEW_WORKFLOW_ID;
const TAG_PREFIX = 'detection-watch:tuning-';

const RULE = {
  id: 'rule-so-1',
  rule_id: 'rule-1',
  name: 'Noisy rule',
  description: 'A rule that fires on a nightly backup job.',
  enabled: true,
  type: 'query',
  language: 'kuery',
  query: 'process.name: *',
  index: ['logs-*'],
  interval: '5m',
  from: 'now-6m',
  to: 'now',
  severity: 'low',
  risk_score: 21,
  revision: 3,
  max_signals: 100,
  filters: [],
  exceptions_list: [],
  tags: [],
};

/** A threshold the rule already has, with a cardinality the proposal must clear. */
const RULE_THRESHOLD = {
  field: ['host.name'],
  value: 10,
  cardinality: [{ field: 'user.name', value: 5 }],
};

const AGENT_TEXT = {
  summary: 'The rule fires on the nightly backup job.',
  title: 'Tune the noisy rule',
  fp_pattern: 'backup.exe on host-a',
  reasoning: '1. All false positives come from backup.exe.',
  confidence: 'medium',
};

/** One answer per output shape the agent can return, plus a broken threshold answer. */
const AGENT_ANSWERS = {
  exception: {
    change_type: 'exception',
    exception_name: 'Nightly backup job on host-a',
    exception_entries: [{ field: 'process.name', operator: 'is', value: 'backup.exe' }],
  },
  /** One entry more than an exception allows (`max_exception_entries`). */
  exception_oversized: {
    change_type: 'exception',
    exception_name: 'Every backup job',
    exception_entries: Array.from({ length: 101 }, (_, index) => ({
      field: 'process.name',
      operator: 'is',
      value: `backup-${index}.exe`,
    })),
  },
  query: {
    change_type: 'query',
    proposed_query: 'process.name: * and not process.name: "backup.exe"',
  },
  risk_score: { change_type: 'risk_score', proposed_risk_score: 10, proposed_severity: 'low' },
  threshold: {
    change_type: 'threshold',
    proposed_threshold_value: 20,
    proposed_threshold_field: ['host.name'],
    proposed_threshold_cardinality: [],
  },
  threshold_incomplete: { change_type: 'threshold', proposed_threshold_value: 20 },
  schedule: { change_type: 'schedule', proposed_interval: '10m', proposed_from: 'now-11m' },
  manual: { change_type: 'manual' },
} as const;

/** The only agent answer that breaks the output schema on purpose. */
const SCHEMA_BREAKING_ANSWERS = ['threshold_incomplete'];

const PREVIEW_RESULT = {
  succeeded: true,
  alert_count: 12,
  is_aborted: false,
  error_text: '',
  proposed_succeeded: true,
  proposed_alert_count: 2,
  proposed_is_aborted: false,
  proposed_error_text: '',
};

const INPUTS = {
  rule_uuid: RULE.id,
  fp_count: 12,
  last_fp_at: '2026-11-01T10:00:00.000Z',
  alert_ids: ['alert-1', 'alert-2', 'alert-3'],
  total_alert_count: 40,
  total_fp_count: 15,
  analysis_window_days: 7,
};

/** What a case says about the run. */
interface Answers extends GateAnswers {
  readonly autonomy?: 'assisted' | 'manual';
  readonly rule?: 'enabled' | 'disabled' | 'not_found';
  /** Fields that replace the fields of the default rule, for example a threshold. */
  readonly ruleFields?: Readonly<Record<string, unknown>>;
  readonly agent?: keyof typeof AGENT_ANSWERS | 'error';
  /** The name of one step to fail, to test the `on-failure` path of that step. */
  readonly failStep?: string;
}

interface Ending extends RunEnd {
  /** The steps that called the proposal workflow. */
  readonly proposals: readonly string[];
  /** The tags added to the alerts, without the `detection-watch:tuning-` prefix. */
  readonly tags: readonly string[];
  readonly investigation: InvestigationState;
  readonly output?: { readonly approved: unknown; readonly applied: unknown };
}

const APPLIED = {
  ends: 'emit_result',
  tags: ['reviewed', 'applied'],
  investigation: 'closed: resolved',
  output: { approved: true, applied: true },
} as const;

const DISMISSED = {
  ends: 'emit_result',
  tags: ['reviewed', 'dismissed'],
  investigation: 'closed: other',
  output: { approved: false, applied: false },
} as const;

const EXPIRED = {
  ends: 'emit_result',
  tags: [],
  investigation: 'open',
  output: { approved: false, applied: false },
} as const;

const NOTHING_RUNS = {
  ends: 'emit_result',
  proposals: [],
  tags: [],
  investigation: 'none',
  output: { approved: false, applied: false },
} as const;

/** An approved exception, with one step that fails and does not stop the review. */
const exceptionApprovedDespite = (step: string) => ({
  name: `${step} fails: the review goes on`,
  answers: { agent: 'exception', gate: 'approved', failStep: step } as const,
  expected: { ...APPLIED, proposals: ['propose_exception'], failedSteps: [step] },
});

const CASES: ReadonlyArray<{ name: string; answers: Answers; expected: Ending }> = [
  // Assisted autonomy: the agent runs at once, and only its proposal asks a human.
  {
    name: 'exception, approved',
    answers: { agent: 'exception', gate: 'approved' },
    expected: { ...APPLIED, proposals: ['propose_exception'] },
  },
  {
    name: 'query, approved',
    answers: { agent: 'query', gate: 'approved' },
    expected: { ...APPLIED, proposals: ['propose_query'] },
  },
  {
    name: 'risk score, approved',
    answers: { agent: 'risk_score', gate: 'approved' },
    expected: { ...APPLIED, proposals: ['propose_risk_score'] },
  },
  {
    name: 'threshold, approved',
    answers: { agent: 'threshold', gate: 'approved' },
    expected: { ...APPLIED, proposals: ['propose_threshold'] },
  },
  {
    name: 'schedule, approved',
    answers: { agent: 'schedule', gate: 'approved' },
    expected: { ...APPLIED, proposals: ['propose_schedule'] },
  },
  {
    name: 'manual, approved: nothing to apply, the alerts are acknowledged',
    answers: { agent: 'manual', gate: 'approved' },
    expected: {
      ...APPLIED,
      proposals: ['propose_manual'],
      tags: ['reviewed', 'acknowledged'],
      output: { approved: true, applied: false },
    },
  },
  {
    name: 'exception, dismissed',
    answers: { agent: 'exception', gate: 'dismissed' },
    expected: { ...DISMISSED, proposals: ['propose_exception'] },
  },
  {
    name: 'manual, dismissed',
    answers: { agent: 'manual', gate: 'dismissed' },
    expected: { ...DISMISSED, proposals: ['propose_manual'] },
  },
  {
    name: 'exception, expired: no tags, so the next sweep reviews the alerts again',
    answers: { agent: 'exception', gate: 'expired' },
    expected: { ...EXPIRED, proposals: ['propose_exception'] },
  },
  {
    name: 'threshold answer without all threshold fields',
    answers: { agent: 'threshold_incomplete' },
    expected: {
      ends: 'failed at incomplete_threshold_output',
      proposals: [],
      tags: [],
      investigation: 'open',
    },
  },
  {
    name: 'agent error',
    answers: { agent: 'error' },
    expected: { ends: 'failed at diagnose_rule', proposals: [], tags: [], investigation: 'open' },
  },
  {
    name: 'disabled rule: nothing runs',
    answers: { rule: 'disabled' },
    expected: NOTHING_RUNS,
  },
  {
    name: 'rule not found: nothing runs',
    answers: { rule: 'not_found' },
    expected: { ...NOTHING_RUNS, failedSteps: ['fetch_rule'] },
  },
  {
    name: 'exception with more entries than an exception allows: the review fails before a proposal',
    answers: { agent: 'exception_oversized' },
    expected: {
      ends: 'failed at reject_oversized_exception',
      proposals: [],
      tags: [],
      investigation: 'open',
    },
  },
  {
    name: 'threshold on a rule with a cardinality, approved: the proposal clears the cardinality',
    answers: { agent: 'threshold', gate: 'approved', ruleFields: { threshold: RULE_THRESHOLD } },
    expected: { ...APPLIED, proposals: ['propose_threshold'] },
  },
  {
    name: 'query on a rule with a data view, approved',
    answers: { agent: 'query', gate: 'approved', ruleFields: { data_view_id: 'logs-data-view' } },
    expected: { ...APPLIED, proposals: ['propose_query'] },
  },

  // Manual autonomy: a human approves the review before the agent runs.
  {
    name: 'manual autonomy, entry approved, exception approved',
    answers: { autonomy: 'manual', entry: 'approved', agent: 'exception', gate: 'approved' },
    expected: { ...APPLIED, proposals: ['propose_entry', 'propose_exception'] },
  },
  {
    name: 'manual autonomy, entry dismissed: the alerts are retired without a diagnosis',
    answers: { autonomy: 'manual', entry: 'dismissed' },
    expected: { ...DISMISSED, ends: 'stop_declined', proposals: ['propose_entry'] },
  },
  {
    name: 'manual autonomy, entry expired: no tags, so the next sweep asks again',
    answers: { autonomy: 'manual', entry: 'expired' },
    expected: { ...EXPIRED, ends: 'stop_expired', proposals: ['propose_entry'] },
  },

  // Steps with `on-failure: continue`. Each case fails one step. The review must still end.
  exceptionApprovedDespite('attach_rule'),
  exceptionApprovedDespite('attach_alerts'),
  exceptionApprovedDespite('build_exception_filter'),
  exceptionApprovedDespite('post_fp_pattern'),
  exceptionApprovedDespite('post_reasoning'),
  exceptionApprovedDespite('attach_exception'),
  exceptionApprovedDespite('refetch_rule'),
  exceptionApprovedDespite('refresh_rule_attachment'),
  exceptionApprovedDespite('report_investigation_closed_applied'),
  exceptionApprovedDespite('report_review_completed'),
  {
    name: 'post_diagnosis_failed fails: the review still fails at the diagnosis',
    answers: { agent: 'error', failStep: 'post_diagnosis_failed' },
    expected: {
      ends: 'failed at diagnose_rule',
      proposals: [],
      tags: [],
      investigation: 'open',
      failedSteps: ['post_diagnosis_failed'],
    },
  },
  {
    name: 'report_investigation_closed_dismissed fails: the review goes on',
    answers: {
      agent: 'exception',
      gate: 'dismissed',
      failStep: 'report_investigation_closed_dismissed',
    },
    expected: {
      ...DISMISSED,
      proposals: ['propose_exception'],
      failedSteps: ['report_investigation_closed_dismissed'],
    },
  },
  {
    name: 'report_investigation_closed_declined fails: the review goes on',
    answers: {
      autonomy: 'manual',
      entry: 'dismissed',
      failStep: 'report_investigation_closed_declined',
    },
    expected: {
      ...DISMISSED,
      ends: 'stop_declined',
      proposals: ['propose_entry'],
      failedSteps: ['report_investigation_closed_declined'],
    },
  },
  {
    name: 'report_review_completed_declined fails: the review goes on',
    answers: {
      autonomy: 'manual',
      entry: 'dismissed',
      failStep: 'report_review_completed_declined',
    },
    expected: {
      ...DISMISSED,
      ends: 'stop_declined',
      proposals: ['propose_entry'],
      failedSteps: ['report_review_completed_declined'],
    },
  },
  {
    name: 'report_review_completed_undecided fails: the review goes on',
    answers: {
      autonomy: 'manual',
      entry: 'expired',
      failStep: 'report_review_completed_undecided',
    },
    expected: {
      ...EXPIRED,
      ends: 'stop_expired',
      proposals: ['propose_entry'],
      failedSteps: ['report_review_completed_undecided'],
    },
  },
  {
    name: 'run_previews fails: the review goes on',
    answers: { agent: 'query', gate: 'approved', failStep: 'run_previews' },
    expected: { ...APPLIED, proposals: ['propose_query'], failedSteps: ['run_previews'] },
  },
  {
    name: 'post_risk_score_note fails: the review goes on',
    answers: { agent: 'risk_score', gate: 'approved', failStep: 'post_risk_score_note' },
    expected: {
      ...APPLIED,
      proposals: ['propose_risk_score'],
      failedSteps: ['post_risk_score_note'],
    },
  },
  {
    name: 'close_investigation_applied fails: the alerts are tagged, the investigation stays open',
    answers: { agent: 'exception', gate: 'approved', failStep: 'close_investigation_applied' },
    expected: {
      ...APPLIED,
      proposals: ['propose_exception'],
      investigation: 'open',
      failedSteps: ['close_investigation_applied'],
    },
  },
  {
    name: 'close_investigation_dismissed fails: the alerts are tagged, the investigation stays open',
    answers: { agent: 'exception', gate: 'dismissed', failStep: 'close_investigation_dismissed' },
    expected: {
      ...DISMISSED,
      proposals: ['propose_exception'],
      investigation: 'open',
      failedSteps: ['close_investigation_dismissed'],
    },
  },
  {
    name: 'close_investigation_declined fails: the alerts are tagged, the investigation stays open',
    answers: { autonomy: 'manual', entry: 'dismissed', failStep: 'close_investigation_declined' },
    expected: {
      ...DISMISSED,
      ends: 'stop_declined',
      proposals: ['propose_entry'],
      investigation: 'open',
      failedSteps: ['close_investigation_declined'],
    },
  },
];

/** What each tuning proposal asks the proposal workflow to run when the analyst approves it. */
const PROPOSED_ACTIONS = [
  {
    caseName: 'query, approved',
    step: 'propose_query',
    impact: 'medium',
    actionWorkflowId: ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
    actionInput: {
      id: RULE.id,
      expected_revision: RULE.revision,
      query: AGENT_ANSWERS.query.proposed_query,
    },
  },
  {
    caseName: 'risk score, approved',
    step: 'propose_risk_score',
    impact: 'low',
    actionWorkflowId: ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
    actionInput: {
      id: RULE.id,
      expected_revision: RULE.revision,
      risk_score: AGENT_ANSWERS.risk_score.proposed_risk_score,
      severity: AGENT_ANSWERS.risk_score.proposed_severity,
    },
  },
  {
    caseName: 'exception, approved',
    step: 'propose_exception',
    impact: 'medium',
    actionWorkflowId: ALERTZERO_ACTION_ADD_RULE_EXCEPTION_WORKFLOW_ID,
    actionInput: {
      rule_id: RULE.id,
      expected_revision: RULE.revision,
      name: AGENT_ANSWERS.exception.exception_name,
      description: 'Added by the rule tuning workflow after 12 false positives were reviewed.',
      entries: AGENT_ANSWERS.exception.exception_entries,
    },
  },
  {
    caseName: 'threshold, approved',
    step: 'propose_threshold',
    impact: 'medium',
    actionWorkflowId: ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
    actionInput: {
      id: RULE.id,
      expected_revision: RULE.revision,
      // An empty proposed cardinality is left out, so the edit keeps the rule as it is.
      threshold: {
        value: AGENT_ANSWERS.threshold.proposed_threshold_value,
        field: AGENT_ANSWERS.threshold.proposed_threshold_field,
      },
    },
  },
  {
    caseName:
      'threshold on a rule with a cardinality, approved: the proposal clears the cardinality',
    step: 'propose_threshold',
    impact: 'medium',
    actionWorkflowId: ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
    actionInput: {
      id: RULE.id,
      expected_revision: RULE.revision,
      threshold: {
        value: AGENT_ANSWERS.threshold.proposed_threshold_value,
        field: AGENT_ANSWERS.threshold.proposed_threshold_field,
        cardinality: [],
      },
    },
  },
  {
    caseName: 'schedule, approved',
    step: 'propose_schedule',
    impact: 'medium',
    actionWorkflowId: ALERTZERO_ACTION_EDIT_RULE_WORKFLOW_ID,
    actionInput: {
      id: RULE.id,
      expected_revision: RULE.revision,
      interval: AGENT_ANSWERS.schedule.proposed_interval,
      from: AGENT_ANSWERS.schedule.proposed_from,
    },
  },
  {
    caseName: 'manual, approved: nothing to apply, the alerts are acknowledged',
    step: 'propose_manual',
    impact: 'low',
    actionWorkflowId: undefined,
    actionInput: undefined,
  },
] as const;

const ruleResponse = ({ rule = 'enabled', ruleFields }: Answers): KibanaApiResponse =>
  rule === 'not_found'
    ? { status: 404, body: { message: 'rule not found' } }
    : { status: 200, body: { ...RULE, ...ruleFields, enabled: rule === 'enabled' } };

const agentOutput = (agent: Answers['agent']) => {
  if (agent === undefined || agent === 'error') {
    throw new Error('The agent run failed.');
  }
  return {
    structured_output: { ...AGENT_TEXT, ...AGENT_ANSWERS[agent] },
    conversation_id: 'agent-conversation-1',
  };
};

const runTuningReview = (answers: Answers): Promise<ManagedWorkflowRun> =>
  runManagedWorkflow({
    workflow: WORKFLOW,
    inputs: { ...INPUTS, autonomy_level: answers.autonomy ?? 'assisted' },
    failStep: answers.failStep,
    fakes: {
      steps: {
        ...INVESTIGATION_STEP_FAKES,
        'security.setAlertTags': { updated: 3 },
        'security.buildExceptionEntriesFilter': { filters: [] },
        'ai.agent': () => agentOutput(answers.agent),
      },
      kibanaSteps: {
        fetch_rule: ruleResponse(answers),
        refetch_rule: ruleResponse(answers),
      },
      childWorkflows: {
        [PROPOSAL_WORKFLOW_ID]: proposalWorkflowFake(answers),
        [PREVIEW_WORKFLOW_ID]: PREVIEW_RESULT,
      },
    },
  });

/** How a run ended, in the terms the cases use. */
const ending = ({ end, calls, output }: ManagedWorkflowRun): Ending => ({
  ...end,
  proposals: proposalSteps(calls),
  tags: [
    ...new Set(
      succeededStepInputs(calls, 'security.setAlertTags')
        .flatMap(({ tags_to_add: added }) => (added as string[] | undefined) ?? [])
        .map((tag) => tag.replace(TAG_PREFIX, ''))
    ),
  ],
  investigation: investigationState(calls),
  ...(output && { output: { approved: output.approved, applied: output.applied } }),
});

describe(`${ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID} through the workflow engine`, () => {
  const runs = new Map<string, ManagedWorkflowRun>();

  beforeAll(async () => {
    for (const { name, answers } of CASES) {
      runs.set(name, await runTuningReview(answers));
    }
  }, 120_000);

  it.each(CASES)('$name', ({ name, expected }) => {
    expect(ending(caseRun(runs, name))).toEqual(expected);
  });

  describe('what each tuning proposal sends', () => {
    it.each(PROPOSED_ACTIONS)(
      '$step',
      ({ caseName, step, impact, actionWorkflowId, actionInput }) => {
        const sent = proposalInputs(caseRun(runs, caseName).calls).get(step);
        expect(sent).toMatchObject({
          conversationId: 'investigation-1',
          title: AGENT_TEXT.title,
          confidence: AGENT_TEXT.confidence,
          impact,
        });
        // Exact match, so a missing field, an extra field or a wrong type fails.
        expect({
          actionWorkflowId: sent?.actionWorkflowId,
          actionInput: sent?.actionInput,
        }).toEqual({ actionWorkflowId, actionInput });
      }
    );

    it.each(PROPOSED_ACTIONS.filter(({ actionWorkflowId }) => actionWorkflowId !== undefined))(
      '$step sends an input that its action workflow accepts',
      ({ caseName, step }) => {
        expect(actionInputErrors(caseRun(runs, caseName).calls, step)).toEqual([]);
      }
    );

    it('has a row for every tuning proposal step', () => {
      const tuningSteps = proposalStepNames(WORKFLOW).filter((name) => name !== 'propose_entry');
      expect(tuningSteps.length).toBeGreaterThan(0);
      expect(
        valuesWithoutCase(
          tuningSteps,
          PROPOSED_ACTIONS.map(({ step }) => step)
        )
      ).toEqual([]);
    });
  });

  it('sends every called workflow inputs that it accepts', () => {
    expect(childInputErrors(runs.values())).toEqual([]);
  });

  it('tags only the alerts of the review', () => {
    expect(
      unexpectedValues(runs.values(), 'security.setAlertTags', 'alert_ids', INPUTS.alert_ids)
    ).toEqual([]);
  });

  describe('the fakes match the real contracts', () => {
    it('gives agent answers that match the agent output schema, except the broken one', () => {
      const matches = matchesStepSchema(WORKFLOW, 'diagnose_rule');
      const invalid = Object.entries(AGENT_ANSWERS)
        .filter(([, agentAnswer]) => !matches({ ...AGENT_TEXT, ...agentAnswer }))
        .map(([key]) => key);
      expect(invalid).toEqual(SCHEMA_BREAKING_ANSWERS);
    });

    it('returns only the outputs the proposal workflow declares', () => {
      expect(undeclaredGateOutputs()).toEqual([]);
    });

    it('returns only the outputs the preview workflow declares', () => {
      const declared = declaredOutputs(PREVIEW_WORKFLOW_ID);
      expect(declared.length).toBeGreaterThan(0);
      expect(valuesWithoutCase(Object.keys(PREVIEW_RESULT), declared)).toEqual([]);
    });
  });

  describe('the cases cover every input value', () => {
    it('has a case for every change_type the agent can return', () => {
      const declared = schemaFieldValues(stepSchema(WORKFLOW, 'diagnose_rule'), 'change_type');
      const covered = CASES.map(({ answers: { agent } }) =>
        agent && agent !== 'error' ? AGENT_ANSWERS[agent].change_type : undefined
      );
      expect(declared.length).toBeGreaterThan(0);
      expect(valuesWithoutCase(declared, covered)).toEqual([]);
    });

    it('has a case for every autonomy level', () => {
      const declared = triggerInputValues(WORKFLOW, 'autonomy_level');
      const covered = CASES.map(({ answers: { autonomy } }) => autonomy ?? 'assisted');
      expect(declared.length).toBeGreaterThan(0);
      expect(valuesWithoutCase(declared, covered)).toEqual([]);
    });
  });

  describeBranchCoverage(WORKFLOW, () => [...runs.values()]);
});
