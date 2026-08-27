/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation, PndProposalRow } from '@kbn/pnd-common';

import { queueEventFromProposal, type QueueEvent } from '../../../../components/queue';

export interface QueueEventFromConversationArgs {
  conversation: PndConversation;
  proposals?: readonly PndProposalRow[];
}

/**
 * Map a nested conversation to a {@link QueueEvent}. Prefer the paired proposal
 * so `actionLabel` comes from `gate.actionLabel`; otherwise the row is the
 * conversation itself with no HITL action.
 */
export const queueEventFromConversation = ({
  conversation,
  proposals = [],
}: QueueEventFromConversationArgs): QueueEvent => {
  const proposal = proposals.find((row) => row.threadConversationId === conversation.id);

  if (proposal != null) {
    return {
      ...queueEventFromProposal({ proposal }),
      id: conversation.id,
      updatedAt: conversation.updatedAt,
    };
  }

  return {
    caseId: conversation.correlationId,
    description: conversation.title,
    ...(conversation.gateId == null ? {} : { gateId: conversation.gateId }),
    id: conversation.id,
    ...(conversation.kind === 'thread' ? { threadConversationId: conversation.id } : {}),
    title: conversation.title,
    updatedAt: conversation.updatedAt,
  };
};
