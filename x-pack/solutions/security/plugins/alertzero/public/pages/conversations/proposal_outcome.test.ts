/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalItem } from '../../../common/proposals/list';
import { proposalOutcome } from './proposal_outcome';

const baseProposal: ProposalItem = {
  id: 'prop-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  comment: 'A proposed action.',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  origin: 'alertzero',
  createdAt: '2026-09-10T10:00:00.000Z',
  expired: false,
  conversationAssignees: [],
};

const analyst = { username: 'mchen', fullName: 'Maya Chen', email: null };

describe('proposalOutcome', () => {
  it('has nothing to report while the proposal is still open', () => {
    expect(proposalOutcome(baseProposal)).toBeUndefined();
  });

  it('names the approver', () => {
    expect(
      proposalOutcome({
        ...baseProposal,
        decision: 'approved',
        status: 'succeeded',
        decidedBy: analyst,
      })
    ).toBe('Approved by Maya Chen');
  });

  it('names whoever declined it', () => {
    expect(
      proposalOutcome({
        ...baseProposal,
        decision: 'dismissed',
        status: 'no_action',
        decidedBy: analyst,
      })
    ).toBe('Declined by Maya Chen');
  });

  it('falls back to the username when the profile carries no full name', () => {
    expect(
      proposalOutcome({
        ...baseProposal,
        decision: 'approved',
        status: 'succeeded',
        decidedBy: { username: 'mchen', fullName: null, email: null },
      })
    ).toBe('Approved by mchen');
  });

  it('reads an unattributed approval as automatic', () => {
    // Nothing writes a synthetic system user, so an absent decider is the only
    // signal that no human approved it.
    expect(proposalOutcome({ ...baseProposal, decision: 'approved', status: 'succeeded' })).toBe(
      'Auto'
    );
  });

  it('still says declined when a dismissal has no decider to name', () => {
    expect(proposalOutcome({ ...baseProposal, decision: 'dismissed', status: 'no_action' })).toBe(
      'Declined'
    );
  });

  it('reports expiry rather than a decision, since nobody made one', () => {
    // `expired` rows reach the closed queue with a decidedAt but never a decision.
    expect(proposalOutcome({ ...baseProposal, status: 'expired' })).toBe('Expired');
    expect(proposalOutcome({ ...baseProposal, expired: true })).toBe('Expired');
  });

  it('prefers the decision over a lapsed deadline once someone has decided', () => {
    expect(
      proposalOutcome({
        ...baseProposal,
        expired: true,
        decision: 'approved',
        status: 'succeeded',
        decidedBy: analyst,
      })
    ).toBe('Approved by Maya Chen');
  });
});
