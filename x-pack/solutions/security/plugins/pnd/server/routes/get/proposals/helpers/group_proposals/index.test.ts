/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow, RecommendedAction } from '@kbn/pnd-common';
import { groupProposals } from '.';

const row = (recommendedAction: RecommendedAction, sourceId: string): PndProposalRow =>
  ({
    alwaysGate: false,
    correlationId: 'ad-1',
    createdAt: '2026-08-02T00:00:00.000Z',
    gateId: 'open_investigation',
    inputSchema: {},
    message: '',
    reasoning: '',
    recommendedAction,
    reversible: true,
    sourceId,
    stepExecutionId: 'step',
    stepId: 'await_open_investigation',
    title: '',
    workflowId: 'wf',
    workflowRunId: 'run',
  } as PndProposalRow);

describe('groupProposals', () => {
  it('creates one group per non-empty bucket', () => {
    const groups = groupProposals([row('investigate', 'a'), row('contain', 'b')]);

    expect(groups).toHaveLength(2);
  });

  it('orders groups by the canonical recommended-action order', () => {
    const groups = groupProposals([row('tune', 'a'), row('contain', 'b'), row('investigate', 'c')]);

    expect(groups.map((g) => g.recommendedAction)).toEqual(['contain', 'investigate', 'tune']);
  });

  it('collects all rows sharing a bucket', () => {
    const groups = groupProposals([row('investigate', 'a'), row('investigate', 'b')]);

    expect(groups[0].proposals).toHaveLength(2);
  });

  it('omits empty buckets', () => {
    const groups = groupProposals([row('escalate', 'a')]);

    expect(groups).toHaveLength(1);
    expect(groups[0].recommendedAction).toEqual('escalate');
  });

  it('returns an empty array for no rows', () => {
    expect(groupProposals([])).toEqual([]);
  });
});
