/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { proposalToInvestigation } from './proposal_to_investigation';
import type { ProposalItem } from '../../../common/proposals/list';

const baseProposal: ProposalItem = {
  id: 'prop-001',
  spaceId: 'default',
  conversationId: 'conv-001',
  title: 'A proposed action',
  comment: 'A detailed description of the proposed action.',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  origin: 'alertzero',
  createdAt: '2026-09-10T10:00:00.000Z',
  conversationAssignees: [],
};

describe('proposalToInvestigation', () => {
  describe('title derivation', () => {
    it('titles the card with the proposal title', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        title: 'Isolate host',
        actionWorkflowId: 'system-alertzero-action-isolate-host',
      });

      expect(result.title).toBe('Isolate host');
      expect(result.primaryActionLabel).toBe('Isolate host');
    });

    it('puts the conversation title on the second line', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        conversationTitle: 'My conversation',
      });

      expect(result.summary).toBe('My conversation');
    });

    it('falls back to a placeholder when the conversation title could not be read', () => {
      const result = proposalToInvestigation({ ...baseProposal });
      expect(result.summary).toBe('Untitled investigation');
    });
  });

  describe('category → bucket mapping', () => {
    it.each([
      ['respond', 'respond'],
      ['investigate', 'investigate'],
      ['configure', 'configure'],
    ] as const)('category %s → bucket %s', (category, expected) => {
      const result = proposalToInvestigation({ ...baseProposal, category });
      expect(result.recommendedAction).toBe(expected);
    });

    it('maps an unrecognised category to investigate (fallback)', () => {
      const result = proposalToInvestigation({ ...baseProposal, category: 'escalate' });
      expect(result.recommendedAction).toBe('investigate');
    });

    it('maps an absent category to investigate (fallback)', () => {
      const { category: _c, ...noCategory } = { ...baseProposal, category: undefined };
      const result = proposalToInvestigation(noCategory as ProposalItem);
      expect(result.recommendedAction).toBe('investigate');
    });
  });

  describe('decided rows', () => {
    it('labels a decided row with its conversation title, which the compact row prints second', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        decidedAt: '2026-09-10T11:00:00.000Z',
        decision: 'approved',
        status: 'succeeded',
        conversationTitle: 'My conversation',
      });
      expect(result.primaryActionLabel).toBe('My conversation');
    });
  });

  describe('title after a decision', () => {
    // The adapter must stay action-agnostic: a worker that needs a specific label sets the
    // proposal title, and the card shows that title before and after the decision.
    it.each(['succeeded', 'failed', 'expired', 'no_action'] as const)(
      'keeps the supplied title once the proposal is %s',
      (status) => {
        const result = proposalToInvestigation({
          ...baseProposal,
          decidedAt: '2026-09-10T11:00:00.000Z',
          status,
          title: 'Close 2 alerts as false positive',
          actionInput: { alertIds: ['a1', 'a2'], reason: 'false_positive' },
        });
        expect(result.title).toBe('Close 2 alerts as false positive');
      }
    );
  });

  describe('closed detection', () => {
    it('sets recommendedAction to "closed" when decidedAt is present, regardless of category', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        category: 'respond',
        decision: 'dismissed',
        status: 'no_action',
        decidedAt: '2026-09-10T11:00:00.000Z',
      });
      expect(result.recommendedAction).toBe('closed');
    });

    it('carries createdAt and decidedAt in proposalCreatedAt and proposalDecidedAt', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        decidedAt: '2026-09-10T11:00:00.000Z',
      });
      expect(result.proposalDecidedAt).toBe('2026-09-10T11:00:00.000Z');
      expect(result.proposalCreatedAt).toBe(baseProposal.createdAt);
    });

    it('does not set "closed" when the proposal is still pending', () => {
      const result = proposalToInvestigation({ ...baseProposal, category: 'respond' });
      expect(result.recommendedAction).toBe('respond');
    });

    it('keeps an approved proposal in its category while its action runs', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        category: 'respond',
        decision: 'approved',
        status: 'executing',
        decidedAt: '2026-09-10T11:00:00.000Z',
      });
      expect(result.recommendedAction).toBe('respond');
      expect(result.isProposalSettling).toBe(true);
      expect(result.pendingProposalCount).toBe(0);
    });

    it('marks an approved proposal that still reads pending as settling and keeps its category', () => {
      // The gate writes the decision before the status, so a read can see both for a moment.
      const result = proposalToInvestigation({
        ...baseProposal,
        category: 'respond',
        decision: 'approved',
        status: 'pending',
        decidedAt: '2026-09-10T11:00:00.000Z',
      });
      expect(result.recommendedAction).toBe('respond');
      expect(result.isProposalSettling).toBe(true);
    });

    it('does not mark an undecided or a settled proposal as settling', () => {
      expect(proposalToInvestigation({ ...baseProposal }).isProposalSettling).toBe(false);
      expect(
        proposalToInvestigation({
          ...baseProposal,
          decision: 'approved',
          status: 'succeeded',
          decidedAt: '2026-09-10T11:00:00.000Z',
        }).isProposalSettling
      ).toBe(false);
    });

    it.each(['succeeded', 'failed', 'expired', 'no_action'] as const)(
      'moves a %s proposal to closed',
      (status) => {
        const result = proposalToInvestigation({
          ...baseProposal,
          category: 'configure',
          status,
          decidedAt: '2026-09-10T11:00:00.000Z',
        });
        expect(result.recommendedAction).toBe('closed');
      }
    );
  });

  describe('status', () => {
    it('is left undefined rather than carrying the proposal status across', () => {
      // A proposal's statuses are not investigation statuses. Mapping 'pending' here
      // would invent a meaning, and any status-based queue filter downstream would then
      // silently hide rows.
      expect(proposalToInvestigation(baseProposal).status).toBeUndefined();
      expect(
        proposalToInvestigation({ ...baseProposal, status: 'succeeded' }).status
      ).toBeUndefined();
    });

    it.each(['open', 'closed'] as const)(
      'carries the investigation status %s as conversationStatus, never as status',
      (conversationStatus) => {
        const result = proposalToInvestigation({
          ...baseProposal,
          status: 'succeeded',
          conversationStatus,
        });

        expect(result.conversationStatus).toBe(conversationStatus);
        expect(result.status).toBeUndefined();
      }
    );

    it('leaves conversationStatus unset when the investigation status is unknown', () => {
      expect(proposalToInvestigation(baseProposal).conversationStatus).toBeUndefined();
    });
  });

  describe('severity collapse', () => {
    it('maps critical → high', () => {
      const result = proposalToInvestigation({ ...baseProposal, impact: 'critical' });
      expect(result.severity).toBe('high');
    });

    it('passes through high, medium, low unchanged', () => {
      expect(proposalToInvestigation({ ...baseProposal, impact: 'high' }).severity).toBe('high');
      expect(proposalToInvestigation({ ...baseProposal, impact: 'medium' }).severity).toBe(
        'medium'
      );
      expect(proposalToInvestigation({ ...baseProposal, impact: 'low' }).severity).toBe('low');
    });
  });

  describe('priorityScore ordering', () => {
    it('critical/high scores higher than low/low', () => {
      const high = proposalToInvestigation({
        ...baseProposal,
        impact: 'critical',
        confidence: 'high',
      });
      const low = proposalToInvestigation({ ...baseProposal, impact: 'low', confidence: 'low' });
      expect(high.priorityScore!).toBeGreaterThan(low.priorityScore!);
    });
  });

  describe('recordId and modals', () => {
    it('recordId equals the proposal id', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.recordId).toBe(baseProposal.id);
    });
  });

  describe('assignee', () => {
    // `Investigation.assignee` is singular because the flyout header renders one avatar.
    it('takes the first assignee', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        conversationAssignees: ['first.analyst', 'second.analyst'],
      });
      expect(result.assignee).toBe('first.analyst');
    });

    it('is null when nobody is assigned', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        conversationAssignees: [],
      });
      expect(result.assignee).toBeNull();
    });
  });

  describe('fixed fields', () => {
    it('id equals proposal id', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.id).toBe(baseProposal.id);
    });

    it('events is empty array', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.events).toEqual([]);
    });

    it('pendingProposalCount is 1 for undecided proposals', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.pendingProposalCount).toBe(1);
    });

    it('pendingProposalCount is 0 for decided proposals', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        decidedAt: '2026-09-10T11:00:00.000Z',
        decision: 'approved',
        status: 'succeeded',
      });
      expect(result.pendingProposalCount).toBe(0);
    });
  });
});
