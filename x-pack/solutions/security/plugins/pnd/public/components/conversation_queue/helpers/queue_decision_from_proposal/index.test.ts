/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_DEEP_ID, type PndProposalRow } from '@kbn/pnd-common';

import { queueDecisionFromProposal } from '.';

const answered = (decision: 'approve' | 'dismiss'): PndProposalRow => ({
  alwaysGate: false,
  correlationId: 'alert-1',
  createdAt: '2026-08-05T12:00:00.000Z',
  decision,
  gateId: 'gate-1',
  inputSchema: {},
  message: 'Gate message',
  rationale: 'Confirmed.',
  reasoning: 'Reasoning',
  recommendedAction: 'contain',
  respondedAt: '2026-08-05T13:00:00.000Z',
  reversible: false,
  sourceId: `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-1:step-1`,
  stepExecutionId: 'step-1',
  stepId: 'await_contain',
  title: 'Gate message',
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: 'run-1',
});

describe('queueDecisionFromProposal', () => {
  it('returns undefined for a pending row, so demote-in-place cannot fire at the top level', () => {
    expect(
      queueDecisionFromProposal({ ...answered('approve'), decision: undefined })
    ).toBeUndefined();
  });

  it('labels an approval so a nested resolved child can demote in place', () => {
    expect(queueDecisionFromProposal(answered('approve'))).toEqual({ label: 'Approved' });
  });

  it('labels a dismissal so a nested resolved child can demote in place', () => {
    expect(queueDecisionFromProposal(answered('dismiss'))).toEqual({ label: 'Dismissed' });
  });
});
