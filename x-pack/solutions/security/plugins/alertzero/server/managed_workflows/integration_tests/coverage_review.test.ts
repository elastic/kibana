/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runs the shipped detection coverage review through the real workflow engine.
 *
 * Each case gives the answers of the boundaries the workflow does not own (the
 * knowledge indicator in Elasticsearch, the agent, the rule API, the human at
 * each proposal gate, the rule creation workflow) and the ending it expects.
 */

import {
  ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW_ID,
  ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW_ID,
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
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
  triggerInputValues,
  undeclaredGateOutputs,
  unexpectedValues,
  valuesWithoutCase,
  type GateAnswers,
  type InvestigationState,
} from './alertzero_workflow_fakes';

const WORKFLOW = managedWorkflow(ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID);
const CREATION_WORKFLOW_ID = ALERTZERO_RULE_CREATION_WORKFLOW_ID;

const INPUTS = { ki_id: 'ki-1', ai_index_id: 'index-1', preview_invocation_count: 2 };

const KI = {
  title: 'No rule detects encoded PowerShell downloads',
  content: 'powershell.exe -enc seen on host-a',
  attributes: { technique: 'T1059.001', space_id: 'fake_space_id' },
};

/** The installed rule the agent matches to the gap. */
const RULE = {
  id: 'rule-so-1',
  rule_id: 'rule-1',
  name: 'Encoded PowerShell download',
  revision: 3,
};
/** The prebuilt rule the agent recommends to install. */
const PREBUILT = { id: 'prebuilt-so-1', rule_id: 'prebuilt-1', name: 'PowerShell download cradle' };

/** The text fields of every agent answer. */
const AGENT_TEXT = {
  rationale: '- The rule query matches encoded PowerShell command lines.',
  rationale_summary: 'The rule detects encoded PowerShell downloads, which the gap reports.',
  technique_matches: true,
};

/** What the prebuilt rule review API returns for the recommended rule. */
const PREBUILT_REVIEW = {
  rules: [
    {
      ...PREBUILT,
      description: 'Detects PowerShell download cradles.',
      language: 'eql',
      severity: 'medium',
      risk_score: 47,
    },
  ],
};

/** One answer per verdict, plus the answers that take the other routes. */
const AGENT_ANSWERS = {
  covered_enabled: {
    verdict: 'covered_enabled',
    rule_id: RULE.rule_id,
    rule_name: RULE.name,
    prebuilt_version: 0,
  },
  covered_disabled: {
    verdict: 'covered_disabled',
    rule_id: RULE.rule_id,
    rule_name: RULE.name,
    prebuilt_version: 0,
  },
  prebuilt_available: {
    verdict: 'prebuilt_available',
    rule_id: PREBUILT.rule_id,
    rule_name: PREBUILT.name,
    prebuilt_version: 3,
  },
  prebuilt_without_version: {
    verdict: 'prebuilt_available',
    rule_id: PREBUILT.rule_id,
    rule_name: PREBUILT.name,
    prebuilt_version: 0,
  },
  no_coverage: { verdict: 'no_coverage', rule_id: '', rule_name: '', prebuilt_version: 0 },
  unknown_verdict: {
    verdict: 'partially_covered',
    rule_id: '',
    rule_name: '',
    prebuilt_version: 0,
  },
} as const;

/** The only agent answer that breaks the output schema on purpose. */
const SCHEMA_BREAKING_ANSWERS = ['unknown_verdict'];

/** What the rule creation workflow returns for each way it can end (see `emit_result` in rule_creation.yaml). */
const CREATION_RESULTS = {
  approved: {
    created: true,
    reviewed: true,
    decision: 'approved',
    rule_name: 'Encoded PowerShell download',
    skip_reason: '',
    no_rule: false,
    proposed: true,
  },
  dismissed: {
    created: false,
    reviewed: true,
    decision: 'dismissed',
    rule_name: 'Encoded PowerShell download',
    skip_reason: '',
    no_rule: false,
    proposed: true,
  },
  expired: {
    created: false,
    reviewed: false,
    decision: '',
    rule_name: 'Encoded PowerShell download',
    skip_reason: '',
    no_rule: false,
    proposed: true,
  },
  /** The draft is not ready, and a later sweep can try again. */
  skipped: {
    created: false,
    reviewed: false,
    decision: '',
    rule_name: '',
    skip_reason: 'The draft is incomplete.',
    no_rule: false,
    proposed: false,
  },
  /** The draft is final: there is no data to build a rule from. */
  no_rule: {
    created: false,
    reviewed: false,
    decision: '',
    rule_name: '',
    skip_reason: 'No data to build a rule from.',
    no_rule: true,
    proposed: false,
  },
} as const;

/** What a case says about the run. */
interface Answers extends GateAnswers {
  readonly autonomy?: 'assisted' | 'manual';
  /** `empty`: the indicator exists, but its content is blank. */
  readonly ki?: 'found' | 'missing' | 'empty';
  readonly agent?: keyof typeof AGENT_ANSWERS | 'error';
  /** What the rule API returns for the rule the agent matched. */
  readonly rule?: 'enabled' | 'disabled' | 'not_found' | 'error';
  readonly creation?: keyof typeof CREATION_RESULTS | 'error';
  /** The name of one step to fail, to test the `on-failure` path of that step. */
  readonly failStep?: string;
}

interface Ending extends RunEnd {
  /** The steps that called the proposal workflow. */
  readonly proposals: readonly string[];
  readonly ruleCreation: boolean;
  readonly investigation: InvestigationState;
  /** The error of a failed run. */
  readonly error?: string;
  /** The outputs that carry a result: true flags and non-empty texts. Absent when the run failed. */
  readonly output?: Readonly<Record<string, unknown>>;
}

/** Outputs that only repeat an id or an input. The ending leaves them out. */
const ECHO_OUTPUTS = new Set([
  'investigation_id',
  'ki_id',
  'verdict',
  'existing_rule',
  'created_rule_name',
]);

const outputResults = (output: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(output).flatMap(([name, value]): Array<[string, unknown]> => {
      if (ECHO_OUTPUTS.has(name)) {
        return [];
      }
      if (value === true) {
        return [[name, true]];
      }
      if (typeof value === 'string' && value.trim() !== '') {
        return [[name, value.trim()]];
      }
      return [];
    })
  );

const ENABLED = {
  ends: 'emit_result',
  proposals: ['propose_enable'],
  ruleCreation: false,
  investigation: 'closed: resolved',
  output: { rule_enabled: true, ki_processed: true },
} as const;

const INSTALLED = {
  ends: 'emit_result',
  proposals: ['propose_install'],
  ruleCreation: false,
  investigation: 'closed: resolved',
  output: { rule_enabled: true, rule_installed: true, ki_processed: true },
} as const;

/** A report proposal the analyst approved: nothing to apply, the gap is processed. */
const reportApproved = (step: string) =>
  ({
    ends: 'emit_result',
    proposals: [step],
    ruleCreation: false,
    investigation: 'closed: other',
    output: { ki_processed: true },
  } as const);

const ENTRY_DISMISSED = {
  ends: 'stop_declined',
  proposals: ['propose_entry'],
  ruleCreation: false,
  investigation: 'closed: other',
  output: { entry_decision: 'dismissed', ki_processed: true },
} as const;

const ENTRY_EXPIRED = {
  ends: 'stop_expired',
  proposals: ['propose_entry'],
  ruleCreation: false,
  investigation: 'open',
  output: { entry_decision: 'expired' },
} as const;

/** No rule can be built: the gap is processed, and the investigation closes. */
const NO_RULE = {
  ends: 'emit_result',
  proposals: [],
  ruleCreation: true,
  investigation: 'closed: other',
  output: { creation_skip_reason: 'No data to build a rule from.', ki_processed: true },
} as const;

/** The draft is not ready: the gap stays pending, and the investigation closes for a retry. */
const RETRY = {
  ends: 'emit_result',
  proposals: [],
  ruleCreation: true,
  investigation: 'closed: other',
  output: { creation_skip_reason: 'The draft is incomplete.' },
} as const;

/** The case for a run that fails one step and must still end as `expected`. */
const failing = (step: string, answers: Answers, expected: Ending) => ({
  name: `${step} fails: the review goes on`,
  answers: { ...answers, failStep: step },
  expected: { ...expected, failedSteps: [...(expected.failedSteps ?? []), step] },
});

/** An approved enable, with one step that fails and does not stop the review. */
const enableApprovedDespite = (step: string) => ({
  name: `${step} fails: the review goes on`,
  answers: {
    agent: 'covered_disabled',
    rule: 'disabled',
    gate: 'approved',
    failStep: step,
  } as const,
  expected: { ...ENABLED, failedSteps: [step] },
});

const CASES: ReadonlyArray<{ name: string; answers: Answers; expected: Ending }> = [
  // covered_disabled: enable the rule.
  {
    name: 'covered_disabled, enable approved: the rule is enabled and the gap processed',
    answers: { agent: 'covered_disabled', rule: 'disabled', gate: 'approved' },
    expected: ENABLED,
  },
  {
    name: 'covered_disabled, enable dismissed: the gap is processed',
    answers: { agent: 'covered_disabled', rule: 'disabled', gate: 'dismissed' },
    expected: {
      ...ENABLED,
      investigation: 'closed: other',
      output: { ki_processed: true },
    },
  },
  {
    name: 'covered_disabled, enable expired: the gap stays pending',
    answers: { agent: 'covered_disabled', rule: 'disabled', gate: 'expired' },
    expected: { ...ENABLED, investigation: 'open', output: {} },
  },
  {
    name: 'covered_disabled, rule not found: a report replaces the enable proposal',
    answers: { agent: 'covered_disabled', rule: 'not_found', gate: 'approved' },
    expected: { ...reportApproved('report_unresolved_rule'), failedSteps: ['resolve_rule'] },
  },
  {
    name: 'covered_disabled, rule API error: the review fails and the next sweep retries',
    answers: { agent: 'covered_disabled', rule: 'error' },
    expected: {
      ends: 'failed at fail_rule_lookup',
      proposals: [],
      ruleCreation: false,
      investigation: 'open',
      failedSteps: ['resolve_rule'],
      error:
        'Could not look up rule rule-1 for the coverage check; the next sweep retries it. HTTP 500: {"message":"rule API unavailable"}',
    },
  },

  // covered_enabled: confirm the rule.
  {
    name: 'covered_enabled, confirm approved',
    answers: { agent: 'covered_enabled', rule: 'enabled', gate: 'approved' },
    expected: {
      ...reportApproved('propose_confirm'),
      investigation: 'closed: resolved',
      output: { coverage_confirmed: true, ki_processed: true },
    },
  },
  {
    name: 'covered_enabled, but the rule is disabled: a report replaces the confirmation',
    answers: { agent: 'covered_enabled', rule: 'disabled', gate: 'approved' },
    expected: reportApproved('report_unconfirmed_rule'),
  },

  // prebuilt_available: install the prebuilt rule.
  {
    name: 'prebuilt_available, install approved',
    answers: { agent: 'prebuilt_available', gate: 'approved' },
    expected: INSTALLED,
  },
  {
    name: 'prebuilt_available without a version: a report replaces the install proposal',
    answers: { agent: 'prebuilt_without_version', gate: 'approved' },
    expected: reportApproved('report_missing_version'),
  },

  // no_coverage: the rule creation workflow drafts and proposes a rule.
  {
    name: 'no_coverage, new rule approved',
    answers: { agent: 'no_coverage', creation: 'approved' },
    expected: {
      ends: 'emit_result',
      proposals: [],
      ruleCreation: true,
      investigation: 'closed: resolved',
      output: { rule_created: true, ki_processed: true },
    },
  },
  {
    name: 'no_coverage, new rule dismissed: the gap is processed',
    answers: { agent: 'no_coverage', creation: 'dismissed' },
    expected: {
      ends: 'emit_result',
      proposals: [],
      ruleCreation: true,
      investigation: 'closed: other',
      output: { ki_processed: true },
    },
  },
  {
    name: 'no_coverage, new rule expired: the gap stays pending',
    answers: { agent: 'no_coverage', creation: 'expired' },
    expected: {
      ends: 'emit_result',
      proposals: [],
      ruleCreation: true,
      investigation: 'open',
      output: {},
    },
  },
  {
    name: 'no_coverage, draft not ready: the gap stays pending and the next sweep retries',
    answers: { agent: 'no_coverage', creation: 'skipped' },
    expected: RETRY,
  },
  {
    name: 'no_coverage, no data for a rule: the gap is processed',
    answers: { agent: 'no_coverage', creation: 'no_rule' },
    expected: NO_RULE,
  },
  {
    name: 'no_coverage, rule creation fails: the review fails and the gap stays pending',
    answers: { agent: 'no_coverage', creation: 'error' },
    expected: {
      ends: 'failed at emit_failure',
      proposals: [],
      ruleCreation: true,
      investigation: 'open',
      failedSteps: ['run_rule_creation'],
      error: 'rule creation failed: The rule creation run failed.',
    },
  },

  // Answers outside the verdicts.
  {
    name: 'unknown verdict: a report asks for a manual follow-up',
    answers: { agent: 'unknown_verdict', gate: 'approved' },
    expected: reportApproved('report_unknown_verdict'),
  },
  {
    name: 'agent error: the review fails and the gap stays pending',
    answers: { agent: 'error' },
    expected: {
      ends: 'failed at emit_failure',
      proposals: [],
      ruleCreation: false,
      investigation: 'open',
      failedSteps: ['coverage_check'],
      error: 'coverage_check produced no verdict: The agent run failed.',
    },
  },
  {
    name: 'knowledge indicator not found: nothing runs',
    answers: { ki: 'missing' },
    expected: {
      ends: 'emit_result',
      proposals: [],
      ruleCreation: false,
      investigation: 'none',
      output: { check_error: 'knowledge indicator not found in this space' },
    },
  },
  {
    name: 'knowledge indicator without content: it is marked invalid',
    answers: { ki: 'empty' },
    expected: {
      ends: 'emit_result',
      proposals: [],
      ruleCreation: false,
      investigation: 'none',
      output: { check_error: 'knowledge indicator has no content', ki_invalid: true },
    },
  },

  // Manual autonomy: a human approves the review before the coverage check.
  {
    name: 'manual autonomy, entry approved, enable approved',
    answers: {
      autonomy: 'manual',
      entry: 'approved',
      agent: 'covered_disabled',
      rule: 'disabled',
      gate: 'approved',
    },
    expected: {
      ...ENABLED,
      proposals: ['propose_entry', 'propose_enable'],
      output: { ...ENABLED.output, entry_decision: 'approved' },
    },
  },
  {
    name: 'manual autonomy, entry dismissed: the gap is processed without a check',
    answers: { autonomy: 'manual', entry: 'dismissed' },
    expected: ENTRY_DISMISSED,
  },
  {
    name: 'manual autonomy, entry expired: the next sweep asks again',
    answers: { autonomy: 'manual', entry: 'expired' },
    expected: ENTRY_EXPIRED,
  },

  // Steps with `on-failure: continue`. Each case fails one step. The review must still end.
  enableApprovedDespite('post_indicator'),
  enableApprovedDespite('attach_rule'),
  enableApprovedDespite('post_reasoning'),
  enableApprovedDespite('refresh_rule_attachment'),
  enableApprovedDespite('report_investigation_closed_resolved'),
  enableApprovedDespite('report_review_completed'),
  failing('fetch_prebuilt_rule', { agent: 'prebuilt_available', gate: 'approved' }, INSTALLED),
  failing(
    'report_investigation_closed_dismissed',
    { agent: 'covered_disabled', rule: 'disabled', gate: 'dismissed' },
    { ...ENABLED, investigation: 'closed: other', output: { ki_processed: true } }
  ),
  failing(
    'report_investigation_closed_declined',
    { autonomy: 'manual', entry: 'dismissed' },
    ENTRY_DISMISSED
  ),
  failing(
    'report_review_completed_declined',
    { autonomy: 'manual', entry: 'dismissed' },
    ENTRY_DISMISSED
  ),
  failing(
    'report_review_completed_undecided',
    { autonomy: 'manual', entry: 'expired' },
    ENTRY_EXPIRED
  ),
  failing('note_no_rule', { agent: 'no_coverage', creation: 'no_rule' }, NO_RULE),
  failing(
    'close_investigation_no_rule',
    { agent: 'no_coverage', creation: 'no_rule' },
    { ...NO_RULE, investigation: 'open' }
  ),
  failing(
    'report_investigation_closed_no_rule',
    { agent: 'no_coverage', creation: 'no_rule' },
    NO_RULE
  ),
  failing('note_retry', { agent: 'no_coverage', creation: 'skipped' }, RETRY),
  failing(
    'close_investigation_retry',
    { agent: 'no_coverage', creation: 'skipped' },
    { ...RETRY, investigation: 'open' }
  ),
  failing(
    'report_investigation_closed_retry',
    { agent: 'no_coverage', creation: 'skipped' },
    RETRY
  ),
  failing(
    'mark_invalid',
    { ki: 'empty' },
    {
      ends: 'emit_result',
      proposals: [],
      ruleCreation: false,
      investigation: 'none',
      output: { check_error: 'knowledge indicator has no content' },
    }
  ),
  failing(
    'note_failure',
    { agent: 'error' },
    {
      ends: 'failed at emit_failure',
      proposals: [],
      ruleCreation: false,
      investigation: 'open',
      failedSteps: ['coverage_check'],
      error: 'coverage_check produced no verdict: The agent run failed.',
    }
  ),
  {
    name: 'refetch_rule fails: the enable is not confirmed, so the gap stays pending',
    answers: {
      agent: 'covered_disabled',
      rule: 'disabled',
      gate: 'approved',
      failStep: 'refetch_rule',
    },
    expected: {
      ...ENABLED,
      investigation: 'open',
      output: { enable_approved_not_applied: true },
      failedSteps: ['refetch_rule'],
    },
  },
  {
    name: 'close_investigation_resolved fails: the investigation stays open',
    answers: {
      agent: 'covered_disabled',
      rule: 'disabled',
      gate: 'approved',
      failStep: 'close_investigation_resolved',
    },
    expected: {
      ...ENABLED,
      investigation: 'open',
      failedSteps: ['close_investigation_resolved'],
    },
  },
  {
    name: 'close_investigation_dismissed fails: the investigation stays open',
    answers: {
      agent: 'covered_disabled',
      rule: 'disabled',
      gate: 'dismissed',
      failStep: 'close_investigation_dismissed',
    },
    expected: {
      ...ENABLED,
      investigation: 'open',
      output: { ki_processed: true },
      failedSteps: ['close_investigation_dismissed'],
    },
  },
  {
    name: 'mark_processed fails: the gap stays pending',
    answers: {
      agent: 'covered_disabled',
      rule: 'disabled',
      gate: 'approved',
      failStep: 'mark_processed',
    },
    expected: { ...ENABLED, output: { rule_enabled: true }, failedSteps: ['mark_processed'] },
  },
  {
    name: 'attach_installed_rule fails: the review goes on',
    answers: { agent: 'prebuilt_available', gate: 'approved', failStep: 'attach_installed_rule' },
    expected: { ...INSTALLED, failedSteps: ['attach_installed_rule'] },
  },
  {
    name: 'mark_declined fails: the declined gap stays pending',
    answers: { autonomy: 'manual', entry: 'dismissed', failStep: 'mark_declined' },
    expected: {
      ...ENTRY_DISMISSED,
      output: { entry_decision: 'dismissed' },
      failedSteps: ['mark_declined'],
    },
  },
  {
    name: 'close_investigation_declined fails: the investigation stays open',
    answers: { autonomy: 'manual', entry: 'dismissed', failStep: 'close_investigation_declined' },
    expected: {
      ...ENTRY_DISMISSED,
      investigation: 'open',
      failedSteps: ['close_investigation_declined'],
    },
  },
];

/** What each coverage proposal asks the proposal workflow to run when the analyst approves it. */
const PROPOSED_ACTIONS = [
  {
    caseName: 'covered_disabled, enable approved: the rule is enabled and the gap processed',
    step: 'propose_enable',
    impact: 'low',
    confidence: 'medium',
    actionWorkflowId: ALERTZERO_ACTION_ENABLE_RULE_WORKFLOW_ID,
    actionInput: {
      id: RULE.id,
      expected_revision: RULE.revision,
      investigation_id: 'investigation-1',
    },
  },
  {
    caseName: 'prebuilt_available, install approved',
    step: 'propose_install',
    impact: 'medium',
    confidence: 'medium',
    actionWorkflowId: ALERTZERO_ACTION_INSTALL_PREBUILT_RULE_WORKFLOW_ID,
    actionInput: { rule_id: PREBUILT.rule_id, version: 3 },
  },
  {
    caseName: 'covered_enabled, confirm approved',
    step: 'propose_confirm',
    impact: 'low',
    confidence: 'medium',
    actionWorkflowId: undefined,
    actionInput: undefined,
  },
  {
    caseName: 'covered_disabled, rule not found: a report replaces the enable proposal',
    step: 'report_unresolved_rule',
    impact: 'low',
    confidence: 'low',
    actionWorkflowId: undefined,
    actionInput: undefined,
  },
  {
    caseName: 'covered_enabled, but the rule is disabled: a report replaces the confirmation',
    step: 'report_unconfirmed_rule',
    impact: 'low',
    confidence: 'low',
    actionWorkflowId: undefined,
    actionInput: undefined,
  },
  {
    caseName: 'prebuilt_available without a version: a report replaces the install proposal',
    step: 'report_missing_version',
    impact: 'low',
    confidence: 'low',
    actionWorkflowId: undefined,
    actionInput: undefined,
  },
  {
    caseName: 'unknown verdict: a report asks for a manual follow-up',
    step: 'report_unknown_verdict',
    impact: 'low',
    confidence: 'low',
    actionWorkflowId: undefined,
    actionInput: undefined,
  },
] as const;

const ruleResponse = (rule: NonNullable<Answers['rule']>): KibanaApiResponse => {
  if (rule === 'not_found') {
    return { status: 404, body: { message: 'rule not found' } };
  }
  if (rule === 'error') {
    return { status: 500, body: { message: 'rule API unavailable' } };
  }
  return { status: 200, body: { ...RULE, enabled: rule === 'enabled' } };
};

const kiResponse = (ki: NonNullable<Answers['ki']>) => ({
  took: 1,
  timed_out: false,
  hits:
    ki === 'missing'
      ? { total: { value: 0, relation: 'eq' }, hits: [] }
      : {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _id: INPUTS.ki_id,
              _index: 'ai-index-idx-index-1',
              _source: ki === 'empty' ? { ...KI, content: '  ' } : KI,
            },
          ],
        },
});

const agentOutput = (agent: Answers['agent']) => {
  if (agent === undefined || agent === 'error') {
    throw new Error('The agent run failed.');
  }
  return {
    structured_output: { ...AGENT_ANSWERS[agent], ...AGENT_TEXT },
    conversation_id: 'agent-conversation-1',
  };
};

const creationResult = (creation: Answers['creation']) => {
  if (creation === undefined || creation === 'error') {
    throw new Error('The rule creation run failed.');
  }
  return CREATION_RESULTS[creation];
};

const runCoverageReview = (answers: Answers): Promise<ManagedWorkflowRun> =>
  runManagedWorkflow({
    workflow: WORKFLOW,
    inputs: { ...INPUTS, autonomy_level: answers.autonomy ?? 'assisted' },
    failStep: answers.failStep,
    fakes: {
      steps: {
        ...INVESTIGATION_STEP_FAKES,
        'context-engine.updateKi': { result: { updated: true } },
        'ai.agent': () => agentOutput(answers.agent),
      },
      elasticsearchSteps: {
        read_ki: kiResponse(answers.ki ?? 'found'),
      },
      kibanaSteps: {
        resolve_rule: ruleResponse(answers.rule ?? 'enabled'),
        fetch_prebuilt_rule: { status: 200, body: PREBUILT_REVIEW },
        // After an approved action the rule exists and is enabled.
        refetch_rule: ({ path }) => ({
          status: 200,
          body: { ...(path.includes(PREBUILT.rule_id) ? PREBUILT : RULE), enabled: true },
        }),
      },
      childWorkflows: {
        [PROPOSAL_WORKFLOW_ID]: proposalWorkflowFake(answers),
        [CREATION_WORKFLOW_ID]: () => creationResult(answers.creation),
        [ALERTZERO_JOURNAL_NOTE_WORKFLOW_ID]: {},
      },
    },
  });

const creationCall = ({ calls }: ManagedWorkflowRun) =>
  calls.find(({ kind, type }) => kind === 'child' && type === CREATION_WORKFLOW_ID);

/** How a run ended, in the terms the cases use. */
const ending = (run: ManagedWorkflowRun): Ending => ({
  ...run.end,
  proposals: proposalSteps(run.calls),
  ruleCreation: creationCall(run) !== undefined,
  investigation: investigationState(run.calls),
  ...(run.output && { output: outputResults(run.output) }),
  ...(run.error && { error: run.error }),
});

describe(`${ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID} through the workflow engine`, () => {
  const runs = new Map<string, ManagedWorkflowRun>();

  beforeAll(async () => {
    for (const { name, answers } of CASES) {
      runs.set(name, await runCoverageReview(answers));
    }
  }, 120_000);

  it.each(CASES)('$name', ({ name, expected }) => {
    expect(ending(caseRun(runs, name))).toEqual(expected);
  });

  describe('what each coverage proposal sends', () => {
    it.each(PROPOSED_ACTIONS)(
      '$step',
      ({ caseName, step, impact, confidence, actionWorkflowId, actionInput }) => {
        const sent = proposalInputs(caseRun(runs, caseName).calls).get(step);
        expect(sent).toMatchObject({ conversationId: 'investigation-1', impact, confidence });
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

    it('has a row for every coverage proposal step', () => {
      const coverageSteps = proposalStepNames(WORKFLOW).filter((name) => name !== 'propose_entry');
      expect(coverageSteps.length).toBeGreaterThan(0);
      expect(
        valuesWithoutCase(
          coverageSteps,
          PROPOSED_ACTIONS.map(({ step }) => step)
        )
      ).toEqual([]);
    });

    it('sends the gap to the rule creation workflow', () => {
      const run = caseRun(runs, 'no_coverage, new rule approved');
      expect(creationCall(run)?.input).toEqual({
        technique: KI.attributes.technique,
        gap_description: KI.title,
        evidence: KI.content,
        preview_invocation_count: INPUTS.preview_invocation_count,
        investigation_id: 'investigation-1',
        review_context: expect.stringContaining(KI.title),
      });
    });
  });

  it('sends every called workflow inputs that it accepts', () => {
    expect(childInputErrors(runs.values())).toEqual([]);
  });

  it('marks only the gap of the review', () => {
    expect([
      ...unexpectedValues(runs.values(), 'context-engine.updateKi', 'ki_id', INPUTS.ki_id),
      ...unexpectedValues(
        runs.values(),
        'context-engine.updateKi',
        'ai_index_id',
        INPUTS.ai_index_id
      ),
    ]).toEqual([]);
  });

  describe('the fakes match the real contracts', () => {
    it('gives agent answers that match the agent output schema, except the broken one', () => {
      const matches = matchesStepSchema(WORKFLOW, 'coverage_check');
      const invalid = Object.entries(AGENT_ANSWERS)
        .filter(([, agentAnswer]) => !matches({ ...agentAnswer, ...AGENT_TEXT }))
        .map(([key]) => key);
      expect(invalid).toEqual(SCHEMA_BREAKING_ANSWERS);
    });

    it('returns only the outputs the proposal workflow declares', () => {
      expect(undeclaredGateOutputs()).toEqual([]);
    });

    it('returns only the outputs the rule creation workflow declares', () => {
      const declared = declaredOutputs(CREATION_WORKFLOW_ID);
      const returned = Object.values(CREATION_RESULTS).flatMap((result) => Object.keys(result));
      expect(declared.length).toBeGreaterThan(0);
      expect(valuesWithoutCase([...new Set(returned)], declared)).toEqual([]);
    });
  });

  describe('the cases cover every input value', () => {
    it('has a case for every verdict the agent can return', () => {
      const declared = schemaFieldValues(stepSchema(WORKFLOW, 'coverage_check'), 'verdict');
      const covered = CASES.map(({ answers: { agent } }) =>
        agent && agent !== 'error' ? AGENT_ANSWERS[agent].verdict : undefined
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
