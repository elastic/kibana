/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';
import type { CoverageCheckResult, CoverageIndicator, CoverageInput } from '../src/types';
import { prebuiltSuggestionDataset } from './prebuilt_suggestion';
import { verdictDataset } from './verdicts';

/**
 * Written answers for the rationale judge: 2 correct answers and 5 answers with one known
 * fault each. The judge must pass the correct ones and fail each bad one on the right question.
 * No workflow runs. The task returns `answer` as it is.
 */
export interface CalibrationInput extends CoverageInput {
  answer: CoverageCheckResult;
}

export interface CalibrationExpected {
  /** True for a correct answer that the judge must pass. */
  judgeShouldPass: boolean;
  /** For a bad answer: the judge must fail at least one of these questions. */
  mustFailOneOf: string[];
}

export interface CalibrationMetadata extends Record<string, unknown> {
  whatIsWrong: string;
}

export interface CalibrationExample
  extends Example<CalibrationInput, CalibrationExpected, CalibrationMetadata> {
  input: CalibrationInput;
  output: CalibrationExpected;
  metadata: CalibrationMetadata;
}

const indicatorOf = (gapId: string): CoverageIndicator => {
  const example = [...prebuiltSuggestionDataset, ...verdictDataset].find(
    ({ input }) => input.gapId === gapId
  );
  if (!example) {
    throw new Error(`No example has gap id ${gapId}`);
  }
  return example.input.indicator;
};

const answer = (
  fields: Pick<
    CoverageCheckResult,
    'verdict' | 'ruleId' | 'ruleName' | 'prebuiltVersion' | 'rationaleSummary' | 'rationale'
  >
): CoverageCheckResult => ({
  workflowExecutionId: 'calibration',
  executionStatus: 'calibration',
  checkFailed: false,
  ...fields,
});

const NSENTER_RULE = {
  ruleId: '5f3ab3ce-7b41-4168-a06a-68d2af8ebc88',
  ruleName: 'Potential Docker Escape via Nsenter',
  prebuiltVersion: 6,
};

// A fixture rule from the verdicts dataset. It is installed and disabled.
const SMB_RULE = {
  ruleId: 'c678f2a7-46c6-4968-bf84-da0432ca4d5d',
  ruleName: 'SMB Admin Share Lateral Movement (Event 5145)',
  prebuiltVersion: 0,
};

const example = (
  calibrationId: string,
  gapId: string,
  answerFields: Parameters<typeof answer>[0],
  expected: CalibrationExpected,
  whatIsWrong: string
): CalibrationExample => ({
  input: {
    gapId: `${calibrationId} (${gapId})`,
    indicator: indicatorOf(gapId),
    answer: answer(answerFields),
  },
  output: expected,
  metadata: { whatIsWrong },
});

export const rationaleCalibrationDataset: CalibrationExample[] = [
  example(
    'CAL-01',
    'RS-08',
    {
      verdict: 'prebuilt_available',
      ...NSENTER_RULE,
      rationaleSummary:
        'The prebuilt rule "Potential Docker Escape via Nsenter" detects a UID change caused by ' +
        'nsenter with a target namespace flag from inside a container on endpoint data, the same ' +
        'behavior and data source the gap reports.',
      rationale: [
        '- The gap describes a process in a container that runs nsenter against PID 1 to enter the host namespaces.',
        '- A search of installed rules for nsenter found no match.',
        '- A search of the prebuilt catalog for nsenter found "Potential Docker Escape via Nsenter".',
        '- The rule detects a UID change event caused by nsenter with the -t or --target flag inside a container, on endpoint process data.',
        '- Conclusion: install this prebuilt rule.',
      ].join('\n'),
    },
    { judgeShouldPass: true, mustFailOneOf: [] },
    'Nothing. A correct answer from a real run.'
  ),
  example(
    'CAL-02',
    'VD-04',
    {
      verdict: 'covered_disabled',
      ...SMB_RULE,
      rationaleSummary:
        'The rule "SMB Admin Share Lateral Movement (Event 5145)" matches event code 5145 against ' +
        'C$ and ADMIN$ share names over winlogbeat-*, which is the exact behavior the gap ' +
        'describes. The rule is installed but currently disabled, so enabling it closes the gap.',
      rationale: [
        '- The gap describes lateral movement through the C$ and ADMIN$ shares, seen in Windows Security event 5145.',
        '- A search of installed rules for "admin share" found "SMB Admin Share Lateral Movement (Event 5145)".',
        '- The rule query checks event code 5145 and share name C$ or ADMIN$ on winlogbeat-*.',
        '- The rule is installed but disabled.',
        '- Conclusion: the verdict is covered_disabled.',
      ].join('\n'),
    },
    { judgeShouldPass: true, mustFailOneOf: [] },
    'Nothing. A correct answer from a real run.'
  ),
  example(
    'CAL-03',
    'RS-08',
    {
      verdict: 'prebuilt_available',
      ...NSENTER_RULE,
      rationaleSummary: 'This rule is the right fix for this gap, because it covers it.',
      rationale: '- The catalog has a matching rule.\n- Conclusion: install it.',
    },
    { judgeShouldPass: false, mustFailOneOf: ['names_shared_behavior'] },
    'The summary names no behavior.'
  ),
  example(
    'CAL-04',
    'RS-08',
    {
      verdict: 'prebuilt_available',
      ...NSENTER_RULE,
      rationaleSummary:
        'The prebuilt rule "Potential Docker Escape via Nsenter" reads auditd setns syscall events ' +
        'from logs-auditd_manager.auditd-* and alerts when a container process calls setns, the ' +
        'same behavior the gap reports.',
      rationale: [
        '- The gap describes a container process that enters the host namespaces.',
        '- The prebuilt rule "Potential Docker Escape via Nsenter" queries auditd syscall events for setns calls.',
        '- Conclusion: install this prebuilt rule.',
      ].join('\n'),
    },
    { judgeShouldPass: false, mustFailOneOf: ['rule_claims_match_rule'] },
    'The rule reads endpoint process events (an EQL uid_change query), not auditd setns syscalls.'
  ),
  example(
    'CAL-05',
    'VD-04',
    {
      verdict: 'covered_disabled',
      ...SMB_RULE,
      rationaleSummary:
        'The rule "SMB Admin Share Lateral Movement (Event 5145)" is installed and enabled and ' +
        'already alerts on event 5145 access to C$ and ADMIN$, so the gap is covered and no ' +
        'action is needed.',
      rationale: [
        '- A search of installed rules for "admin share" found "SMB Admin Share Lateral Movement (Event 5145)".',
        '- The rule is enabled and runs every 5 minutes.',
        '- Conclusion: the verdict is covered_disabled.',
      ].join('\n'),
    },
    { judgeShouldPass: false, mustFailOneOf: ['agrees_with_verdict', 'rule_claims_match_rule'] },
    'The text calls the disabled rule enabled and says that no action is needed.'
  ),
  example(
    'CAL-06',
    'VD-06',
    {
      verdict: 'no_coverage',
      rationaleSummary:
        'The installed rule "Encoded PowerShell Command on Windows Endpoints" detects the bulk ' +
        'export of bank details by the payroll service account.',
      rationale: [
        '- A search of installed rules found "Encoded PowerShell Command on Windows Endpoints".',
        '- This rule detects the bulk export.',
        '- Conclusion: the verdict is no_coverage.',
      ].join('\n'),
    },
    { judgeShouldPass: false, mustFailOneOf: ['agrees_with_verdict'] },
    'The text says that a rule detects the gap, but the verdict is no_coverage.'
  ),
  example(
    'CAL-07',
    'RS-08',
    {
      verdict: 'prebuilt_available',
      ...NSENTER_RULE,
      ruleId: '00000000-0000-4000-8000-000000000000',
      rationaleSummary:
        'The prebuilt rule "Potential Docker Escape via Nsenter" detects a UID change caused by ' +
        'nsenter with a target namespace flag from inside a container on endpoint data, the same ' +
        'behavior and data source the gap reports.',
      rationale:
        '- A search of the prebuilt catalog for nsenter found "Potential Docker Escape via Nsenter".\n' +
        '- Conclusion: install this prebuilt rule.',
    },
    { judgeShouldPass: false, mustFailOneOf: ['rule_claims_match_rule'] },
    'The rule_id is invented. No rule has it, so the proposal cannot install the rule.'
  ),
];
