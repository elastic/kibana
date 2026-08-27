/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation, PndProposalRow } from '@kbn/pnd-common';

import { actionLabel } from '../../../../components/queue';

import { queueEventFromConversation } from '.';

const conversation: PndConversation = {
  correlationId: 'ad-1',
  createdAt: '2026-08-02T00:00:00.000Z',
  gateId: 'incident_contained',
  id: 'thread-1',
  kind: 'thread',
  title: 'Has the staging directory stopped being written to?',
  updatedAt: '2026-08-02T01:00:00.000Z',
};

const proposal: PndProposalRow = {
  alwaysGate: true,
  correlationId: 'ad-1',
  createdAt: '2026-08-02T00:00:00.000Z',
  gateId: 'incident_contained',
  inputSchema: { type: 'object' },
  message: 'Confirm containment of host-1.',
  reasoning: 'The staging directory is still being written to.',
  recommendedAction: 'contain',
  reversible: false,
  sourceId: 'src-1',
  stepExecutionId: 'step-1',
  stepId: 'await_incident_contained',
  threadConversationId: 'thread-1',
  title: 'Confirm containment',
  workflowId: 'system-security-watch-floor',
  workflowRunId: 'run-1',
};

describe('queueEventFromConversation', () => {
  it('uses the conversation id as the event id so a deep link can select the row', () => {
    const event = queueEventFromConversation({ conversation });

    expect(event.id).toBe(conversation.id);
  });

  it('fills actionLabel from the paired proposal gate, never a hardcoded Approve', () => {
    const event = queueEventFromConversation({ conversation, proposals: [proposal] });

    expect(event.actionLabel).toBe(actionLabel('incident_contained'));
  });

  it('keeps the conversation id when a proposal is paired, so selection is not the sourceId', () => {
    const event = queueEventFromConversation({ conversation, proposals: [proposal] });

    expect(event.id).toBe(conversation.id);
  });

  it('carries no action when no proposal is paired', () => {
    const event = queueEventFromConversation({ conversation });

    expect(event.actionLabel).toBeUndefined();
  });

  it('carries the conversation updatedAt so the row can show last updated', () => {
    const event = queueEventFromConversation({ conversation });

    expect(event.updatedAt).toEqual(conversation.updatedAt);
  });

  it('keeps the conversation updatedAt when a proposal is paired', () => {
    const event = queueEventFromConversation({ conversation, proposals: [proposal] });

    expect(event.updatedAt).toEqual(conversation.updatedAt);
  });
});
