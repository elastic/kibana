/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { proposalToInvestigation } from './proposal_to_investigation';
import type { ProposalItem } from '../../../common/proposals/list';
import type { ProposalWithMetadata } from '@kbn/agentic-investigations-plugin/common';

const QUEUE_STATUSES = new Set(['open', 'investigating', 'in-progress', 'escalated']);

const isQueueRow = (status?: string): boolean => QUEUE_STATUSES.has(status ?? 'open');

const baseProposal: ProposalItem = {
  id: 'prop-001',
  spaceId: 'default',
  conversationId: 'conv-001',
  comment: 'A detailed description of the proposed action.',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  origin: 'worker',
  createdAt: '2026-09-10T10:00:00.000Z',
  expired: false,
};

describe('proposalToInvestigation', () => {
  describe('title derivation', () => {
    it('prefers conversationTitle', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        conversationTitle: 'My conversation',
        actionWorkflowId: 'wf-1',
      });
      expect(result.title).toBe('My conversation');
    });

    it('falls back to action.name when conversationTitle is absent', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        action: { name: 'Isolate host' } as ProposalWithMetadata['action'],
        actionWorkflowId: 'wf-1',
      });
      expect(result.title).toBe('Isolate host');
    });

    it('falls back to actionWorkflowId when action.name is absent', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        actionWorkflowId: 'system-alertzero-action-block-ip',
      });
      expect(result.title).toBe('system-alertzero-action-block-ip');
    });

    it('falls back to sentinel when nothing is available', () => {
      const result = proposalToInvestigation({ ...baseProposal });
      expect(result.title).toBe('No automated action');
    });
  });

  describe('category → bucket mapping', () => {
    it.each([
      ['respond', 'respond'],
      ['investigate', 'investigate'],
      ['configure', 'configure'],
      ['tune', 'configure'], // legacy mapping
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

  describe('closed detection', () => {
    it('sets recommendedAction to "closed" when decidedAt is present, regardless of category', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        category: 'respond',
        status: 'dismissed',
        decidedAt: '2026-09-10T11:00:00.000Z',
      });
      expect(result.recommendedAction).toBe('closed');
    });

    it('does not set "closed" when decidedAt is absent', () => {
      const result = proposalToInvestigation({ ...baseProposal, category: 'respond' });
      expect(result.recommendedAction).toBe('respond');
    });
  });

  describe('isQueueRow regression', () => {
    it('status is undefined so isQueueRow passes (defaults to "open")', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.status).toBeUndefined();
      expect(isQueueRow(result.status)).toBe(true);
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

  describe('fixed fields', () => {
    it('id equals proposal id', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.id).toBe(baseProposal.id);
    });

    it('events is empty array', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.events).toEqual([]);
    });

    it('affectedSurface is undefined', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.affectedSurface).toBeUndefined();
    });

    it('pendingProposalCount is 1 for undecided proposals', () => {
      const result = proposalToInvestigation(baseProposal);
      expect(result.pendingProposalCount).toBe(1);
    });

    it('pendingProposalCount is 0 for decided proposals', () => {
      const result = proposalToInvestigation({
        ...baseProposal,
        decidedAt: '2026-09-10T11:00:00.000Z',
        status: 'approved',
      });
      expect(result.pendingProposalCount).toBe(0);
    });
  });
});
