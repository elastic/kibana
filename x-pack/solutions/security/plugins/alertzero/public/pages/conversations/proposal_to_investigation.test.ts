/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { proposalToInvestigation } from './proposal_to_investigation';
import type { ProposalItem } from '../../../common/proposals/list';
import type { ProposalWithMetadata } from '@kbn/proposals-common';

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
    it('titles the card with the investigation it belongs to', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        conversationTitle: 'My conversation',
        actionWorkflowId: 'wf-1',
      });
      expect(result.title).toBe('My conversation');
    });

    it('never titles the card with the action, which is already the call to action', () => {
      // Titling by action name loses the only thing that says which incident this
      // decision is about, and repeats the CTA label right beside it.
      const result = proposalToInvestigation({
        ...baseProposal,
        // What the server stores when the caller names nothing itself.
        title: 'Isolate host',
        action: { name: 'Isolate host' } as ProposalWithMetadata['action'],
        actionWorkflowId: 'system-alertzero-action-isolate-host',
      });

      expect(result.title).not.toBe('Isolate host');
      expect(result.title).not.toBe('system-alertzero-action-isolate-host');
      expect(result.primaryActionLabel).toBe('Isolate host');
    });

    // The card renders the summary as plain text, so a markdown comment
    // arrived as literal asterisks and headings.
    it('summarises the row with the title rather than the markdown comment', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        title: 'Tune the Okta rule',
        comment: '**Bold heading**\n\nSome *markdown* body',
      });

      expect(result.summary).toBe('Tune the Okta rule');
    });

    it('labels the row with the proposal title over the action name', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        title: 'Tune the Okta rule',
        action: { name: 'Edit rule' } as ProposalWithMetadata['action'],
        actionWorkflowId: 'system-alertzero-action-edit-rule',
      });

      expect(result.primaryActionLabel).toBe('Tune the Okta rule');
    });

    it('falls back to a placeholder when the conversation title could not be read', () => {
      const result = proposalToInvestigation({ ...baseProposal });
      expect(result.title).toBe('Untitled investigation');
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

  describe('closed action label derivation', () => {
    const decidedAt = '2026-09-10T11:00:00.000Z';
    const closeAction = {
      name: 'Close alerts as false positive',
    } as ProposalWithMetadata['action'];

    it('uses "N alerts closed as false positive" once the close succeeded', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        decidedAt,
        status: 'succeeded',
        actionInput: { alertIds: ['a1', 'a2', 'a3'], reason: 'false_positive' },
      });
      expect(result.primaryActionLabel).toBe('3 alerts closed as false positive');
    });

    it('singularises "alert" when count is 1', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        decidedAt,
        status: 'succeeded',
        actionInput: { alertIds: ['a1'], reason: 'false_positive' },
      });
      expect(result.primaryActionLabel).toBe('1 alert closed as false positive');
    });

    it.each(['no_action', 'expired', 'failed'] as const)(
      'keeps the proposal title for a %s proposal, since nothing was closed',
      (status) => {
        const result = proposalToInvestigation({
          ...baseProposal,
          decidedAt,
          status,
          title: 'Close alerts as false positive',
          action: closeAction,
          actionInput: { alertIds: ['a1', 'a2'], reason: 'false_positive' },
        });
        expect(result.primaryActionLabel).toBe('Close alerts as false positive');
      }
    );

    it('keeps the proposal title for a succeeded proposal of another action', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        decidedAt,
        status: 'succeeded',
        title: 'Isolate host',
        action: { name: 'Isolate host' } as ProposalWithMetadata['action'],
        actionInput: { alertIds: ['a1'] },
      });
      expect(result.primaryActionLabel).toBe('Isolate host');
    });

    it('falls back to the proposal title when alertIds is absent', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        decidedAt,
        status: 'succeeded',
        title: 'Close alerts as false positive',
      });
      expect(result.primaryActionLabel).toBe('Close alerts as false positive');
    });

    it('does not override primaryActionLabel for pending proposals', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        title: 'Close alerts as false positive',
        actionInput: { alertIds: ['a1', 'a2'], reason: 'false_positive' },
      });
      expect(result.primaryActionLabel).toBe('Close alerts as false positive');
    });
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

    it('does not set "closed" when decidedAt is absent', () => {
      const result = proposalToInvestigation({ ...baseProposal, category: 'respond' });
      expect(result.recommendedAction).toBe('respond');
    });
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

    it('affectedSurface is undefined when Impact was not hydrated', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.affectedSurface).toBeUndefined();
      expect(result.entityIds).toBeUndefined();
    });

    it('copies hydrated entity ids onto the card and uses the first as affectedSurface', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        entityIds: ['cfo@corp', 'host-1'],
      });
      expect(result.entityIds).toEqual(['cfo@corp', 'host-1']);
      expect(result.affectedSurface).toBe('cfo@corp');
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
