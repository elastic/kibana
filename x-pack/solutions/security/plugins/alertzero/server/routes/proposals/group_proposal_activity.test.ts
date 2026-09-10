/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';
import { CLOSED_GROUP_KEY } from '../../../common/proposals/activity';
import { groupProposalActivity } from './group_proposal_activity';

const baseProposal: ProposalWithMetadata = {
  id: 'p1',
  spaceId: 'default',
  conversationId: 'conv-1',
  comment: 'Block the IP',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  category: 'contain',
  origin: 'worker',
  createdAt: '2026-09-01T10:00:00.000Z',
  expired: false,
};

const makeProposal = (overrides: Partial<ProposalWithMetadata>): ProposalWithMetadata => ({
  ...baseProposal,
  ...overrides,
});

describe('groupProposalActivity', () => {
  it('places a pending proposal under its category, not under closed', () => {
    const proposals = [makeProposal({ status: 'pending', category: 'contain' })];
    const groups = groupProposalActivity(proposals, new Map());

    expect(groups.contain).toHaveLength(1);
    expect(groups[CLOSED_GROUP_KEY]).toHaveLength(0);
  });

  it('places a decided proposal under closed, not under its category', () => {
    const proposals = [
      makeProposal({
        status: 'dismissed',
        category: 'contain',
        decidedAt: '2026-09-09T10:00:00.000Z',
      }),
    ];
    const groups = groupProposalActivity(proposals, new Map());

    expect(groups[CLOSED_GROUP_KEY]).toHaveLength(1);
    expect(groups.contain).toHaveLength(0);
  });

  it('always seeds the baseline category keys even when empty', () => {
    const groups = groupProposalActivity([], new Map());

    expect(groups).toHaveProperty(CLOSED_GROUP_KEY);
    expect(groups).toHaveProperty('contain');
    expect(groups).toHaveProperty('escalate');
    expect(groups).toHaveProperty('investigate');
    expect(groups).toHaveProperty('tune');
  });

  it('passes through an unknown category string not in the baseline', () => {
    const proposals = [makeProposal({ status: 'pending', category: 'remediate' })];
    const groups = groupProposalActivity(proposals, new Map());

    expect(groups.remediate).toHaveLength(1);
  });

  it('joins a conversation title when available', () => {
    const proposal = makeProposal({ conversationId: 'conv-abc' });
    const titles = new Map([['conv-abc', 'My investigation']]);
    const groups = groupProposalActivity([proposal], titles);

    expect(groups.contain[0].conversationTitle).toBe('My investigation');
  });

  it('omits conversationTitle when the id is not in the titles map', () => {
    const proposal = makeProposal({ conversationId: 'conv-missing' });
    const groups = groupProposalActivity([proposal], new Map());

    expect(groups.contain[0]).not.toHaveProperty('conversationTitle');
  });

  it('sorts the closed bucket by decidedAt descending', () => {
    const proposals = [
      makeProposal({ id: 'older', status: 'dismissed', decidedAt: '2026-09-08T10:00:00.000Z' }),
      makeProposal({ id: 'newer', status: 'succeeded', decidedAt: '2026-09-09T10:00:00.000Z' }),
    ];
    const groups = groupProposalActivity(proposals, new Map());

    expect(groups[CLOSED_GROUP_KEY][0].id).toBe('newer');
    expect(groups[CLOSED_GROUP_KEY][1].id).toBe('older');
  });

  it('preserves the original order for category buckets', () => {
    const proposals = [
      makeProposal({ id: 'first', status: 'pending', category: 'investigate' }),
      makeProposal({ id: 'second', status: 'pending', category: 'investigate' }),
    ];
    const groups = groupProposalActivity(proposals, new Map());

    expect(groups.investigate[0].id).toBe('first');
    expect(groups.investigate[1].id).toBe('second');
  });
});
