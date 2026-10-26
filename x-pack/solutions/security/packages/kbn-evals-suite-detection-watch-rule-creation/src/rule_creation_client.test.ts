/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { DRAFT_STEP_ID } from './constants';
import { extractDraftFromSteps } from './rule_creation_client';

const draftSteps = (structuredOutput: Record<string, unknown>) =>
  [
    { stepId: DRAFT_STEP_ID, output: null },
    { stepId: DRAFT_STEP_ID, output: { structured_output: structuredOutput } },
  ] as unknown as WorkflowStepExecutionDto[];

const emptyRule = {
  name: '',
  description: '',
  query: '',
  language: 'esql',
  type: 'esql',
  severity: 'low',
  risk_score: 0,
  interval: '',
  from: '',
  threat: [],
  tags: [],
};

describe('extractDraftFromSteps', () => {
  it('returns the drafted rule when the agent built one', () => {
    const rule = { ...emptyRule, name: 'Sudo brute force', query: 'FROM logs-* | LIMIT 1' };

    expect(extractDraftFromSteps(draftSteps({ rule, attachment_id: 'a-1', reason: '' }))).toEqual({
      rule,
      skipped: false,
      skipReason: undefined,
    });
  });

  it('treats an empty name and query as a quality-gate refusal', () => {
    expect(
      extractDraftFromSteps(
        draftSteps({
          rule: emptyRule,
          attachment_id: '',
          reason: 'The data source does not exist.',
        })
      )
    ).toEqual({ rule: undefined, skipped: true, skipReason: 'The data source does not exist.' });
  });

  it('reports a refusal without a reason as skipped with no reason', () => {
    expect(
      extractDraftFromSteps(draftSteps({ rule: emptyRule, attachment_id: '', reason: '' }))
    ).toEqual({ rule: undefined, skipped: true, skipReason: undefined });
  });

  it('keeps a partial draft that has a query, so evaluators can score it', () => {
    const rule = { ...emptyRule, query: 'FROM logs-* | LIMIT 1' };

    expect(extractDraftFromSteps(draftSteps({ rule, attachment_id: '' }))).toEqual({
      rule,
      skipped: false,
      skipReason: undefined,
    });
  });

  it('returns neither a rule nor a skip when draft_creation produced no output', () => {
    expect(
      extractDraftFromSteps([
        { stepId: DRAFT_STEP_ID, output: null },
      ] as unknown as WorkflowStepExecutionDto[])
    ).toEqual({ rule: undefined, skipped: false, skipReason: undefined });
  });
});
