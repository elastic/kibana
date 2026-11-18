/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/proposals-common';
import { describeSettlementProblems, expectedSettledStatus } from './proposal_gate';

const proposal = (overrides: Partial<ProposalWithMetadata>): ProposalWithMetadata =>
  ({ id: 'p1', status: 'pending', ...overrides } as ProposalWithMetadata);

describe('expectedSettledStatus', () => {
  it.each([
    ['approved', 'wf-1', 'succeeded'],
    ['approved', undefined, 'no_action'],
    ['dismissed', 'wf-1', 'no_action'],
    ['dismissed', undefined, 'no_action'],
  ] as const)('returns %s for %s with action %s', (decision, actionWorkflowId, expected) => {
    expect(expectedSettledStatus({ actionWorkflowId }, decision)).toBe(expected);
  });
});

describe('describeSettlementProblems', () => {
  const decided = [proposal({ id: 'p1', actionWorkflowId: 'wf-1' }), proposal({ id: 'p2' })];

  it('returns nothing when every record matches the decision', () => {
    expect(
      describeSettlementProblems({
        decided,
        settled: [
          proposal({
            id: 'p1',
            actionWorkflowId: 'wf-1',
            decision: 'approved',
            status: 'succeeded',
          }),
          proposal({ id: 'p2', decision: 'approved', status: 'no_action' }),
        ],
        decision: 'approved',
      })
    ).toEqual([]);
  });

  it('names an actioned Proposal that executed after a dismiss', () => {
    expect(
      describeSettlementProblems({
        decided,
        settled: [
          proposal({
            id: 'p1',
            actionWorkflowId: 'wf-1',
            decision: 'dismissed',
            status: 'succeeded',
          }),
          proposal({ id: 'p2', decision: 'dismissed', status: 'no_action' }),
        ],
        decision: 'dismissed',
      })
    ).toEqual(['p1: status is succeeded, expected no_action']);
  });

  it('names a missing dismiss reason', () => {
    expect(
      describeSettlementProblems({
        decided: [proposal({ id: 'p2' })],
        settled: [proposal({ id: 'p2', decision: 'dismissed', status: 'no_action' })],
        decision: 'dismissed',
        dismissReason: 'risk_accepted',
      })
    ).toEqual(['p2: dismissReason is unset, expected risk_accepted']);
  });

  it('names a Proposal that disappeared after the decision', () => {
    expect(
      describeSettlementProblems({
        decided: [proposal({ id: 'p9' })],
        settled: [],
        decision: 'approved',
      })
    ).toEqual(['p9: missing after decision']);
  });
});
