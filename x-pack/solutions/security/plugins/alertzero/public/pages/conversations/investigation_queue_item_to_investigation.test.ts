/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/proposals-common';
import type { InvestigationQueueItem } from '../../../common/investigations/queue';
import {
  investigationQueueItemToInvestigation,
  queueCardId,
  toProposalItem,
} from './investigation_queue_item_to_investigation';

const leadProposal: ProposalWithMetadata = {
  id: 'prop-001',
  spaceId: 'default',
  conversationId: 'conv-001',
  title: 'Isolate host',
  comment: 'A **markdown** comment.',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  category: 'respond',
  origin: 'alertzero',
  createdAt: '2026-09-10T10:00:00.000Z',
};

const openItem: InvestigationQueueItem = {
  id: 'conv-001',
  title: 'Credential stuffing on the VPN',
  description: 'Repeated failed logins from one ASN, then a success.',
  agentId: 'elastic-ai-agent',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-11T00:00:00.000Z',
  status: 'open',
  assignees: ['user-1', 'user-2'],
  entityIds: ['host:a'],
  category: 'respond',
  newestProposalAt: '2026-09-12T08:00:00.000Z',
  pendingProposalCount: 2,
  leadProposal,
};

const closedItem: InvestigationQueueItem = {
  id: 'conv-002',
  title: 'Old incident',
  description: 'Resolved after the credential was rotated.',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-11T00:00:00.000Z',
  status: 'closed',
  closeReason: 'resolved',
  assignees: [],
};

describe('investigationQueueItemToInvestigation', () => {
  it('titles the card with the investigation and describes it with its description', () => {
    const result = investigationQueueItemToInvestigation(openItem);

    expect(result.title).toBe('Credential stuffing on the VPN');
    expect(result.summary).toBe('Repeated failed logins from one ASN, then a success.');
  });

  it('never uses the proposal title as the card description', () => {
    const result = investigationQueueItemToInvestigation({ ...openItem, description: undefined });

    expect(result.summary).toBeUndefined();
    expect(result.primaryActionLabel).toBe('Isolate host');
  });

  it('falls back to a placeholder when the investigation has no title', () => {
    const result = investigationQueueItemToInvestigation({ ...openItem, title: undefined });

    expect(result.title).toBe('Untitled investigation');
  });

  it('keys an open card by its lead proposal and a closed card by the investigation', () => {
    expect(queueCardId(openItem)).toBe('prop-001');
    expect(queueCardId(closedItem)).toBe('conv-002');
    expect(investigationQueueItemToInvestigation(openItem)).toMatchObject({
      id: 'prop-001',
      recordId: 'prop-001',
      conversationId: 'conv-001',
    });
  });

  it('files an open card under the lead proposal category, with a fallback for an unknown one', () => {
    expect(investigationQueueItemToInvestigation(openItem).recommendedAction).toBe('respond');
    expect(
      investigationQueueItemToInvestigation({
        ...openItem,
        category: 'something-new',
      }).recommendedAction
    ).toBe('investigate');
  });

  it('ages an open card from its newest proposal and keeps the pending count', () => {
    const result = investigationQueueItemToInvestigation(openItem);

    expect(result.createdAt).toBe('2026-09-12T08:00:00.000Z');
    expect(result.pendingProposalCount).toBe(2);
  });

  it('ranks an open card by its lead proposal, collapsing critical impact to high severity', () => {
    const result = investigationQueueItemToInvestigation({
      ...openItem,
      leadProposal: { ...leadProposal, impact: 'critical', confidence: 'medium' },
    });

    expect(result.severity).toBe('high');
    expect(result.priorityScore).toBe(4 * 20 + 2 * 5);
  });

  it('keeps an open card in its category once every proposal is decided, with no action to offer', () => {
    const { leadProposal: _lead, ...decided } = openItem;
    const result = investigationQueueItemToInvestigation({ ...decided, pendingProposalCount: 0 });

    expect(result).toMatchObject({
      id: 'conv-001',
      recommendedAction: 'respond',
      pendingProposalCount: 0,
    });
    expect(result.severity).toBeUndefined();
    expect(result.primaryActionLabel).toBe('Repeated failed logins from one ASN, then a success.');
  });

  it('carries assignees and entities', () => {
    const result = investigationQueueItemToInvestigation(openItem);

    expect(result).toMatchObject({
      assignee: 'user-1',
      assignees: ['user-1', 'user-2'],
      entityIds: ['host:a'],
      affectedSurface: 'host:a',
    });
  });

  it('files a closed investigation under closed and shows its description in the compact line', () => {
    const result = investigationQueueItemToInvestigation(closedItem);

    expect(result).toMatchObject({
      recommendedAction: 'closed',
      status: 'closed',
      pendingProposalCount: 0,
      primaryActionLabel: 'Resolved after the credential was rotated.',
      updatedAt: closedItem.updatedAt,
    });
    expect(result.severity).toBeUndefined();
  });
});

describe('toProposalItem', () => {
  it('merges the investigation fields the approval flows read onto the lead proposal', () => {
    expect(toProposalItem(openItem)).toEqual({
      ...leadProposal,
      conversationTitle: 'Credential stuffing on the VPN',
      conversationAgentId: 'elastic-ai-agent',
      conversationAssignees: ['user-1', 'user-2'],
      entityIds: ['host:a'],
    });
  });

  it('has no proposal for a closed investigation', () => {
    expect(toProposalItem(closedItem)).toBeUndefined();
  });
});
