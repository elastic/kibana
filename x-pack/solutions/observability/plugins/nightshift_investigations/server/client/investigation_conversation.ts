/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationAccessControlMode,
  isConversationAlreadyExistsError,
} from '@kbn/agent-builder-common';
import type { Conversation, ConversationPermissions } from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { INVESTIGATION_TEMPLATE_ID } from '@kbn/agentic-investigations-plugin/common';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import { InvestigationNotFoundError } from './errors';

/** The investigation conversation as the write path needs it. */
export interface InvestigationConversation {
  /** The investigation id, which is the conversation id. */
  id: string;
  /** Agent Builder's placeholder until Agent Builder titles it on the first round. */
  title: string;
  /** `metadata.status`; a missing status reads as open. */
  status: 'open' | 'closed';
  /** `metadata.workflow_execution_ids`: the workflow runs that worked on the investigation. */
  workflowExecutionIds: string[];
  /** This call created the conversation. */
  created: boolean;
}

type ConversationWithAccess = Pick<Conversation, 'id' | 'title' | 'metadata' | 'template_id'> & {
  permissions: ConversationPermissions;
};

const toWorkflowExecutionIds = (metadata: ConversationWithAccess['metadata']): string[] => {
  const ids = metadata?.workflow_execution_ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
};

const toInvestigationConversation = (
  conversation: ConversationWithAccess,
  created: boolean
): InvestigationConversation => {
  if (conversation.template_id !== INVESTIGATION_TEMPLATE_ID) {
    // An id that names some other conversation is not an investigation, whatever the caller says.
    throw new InvestigationNotFoundError(conversation.id);
  }
  return {
    id: conversation.id,
    title: conversation.title,
    status: conversation.metadata?.status === 'closed' ? 'closed' : 'open',
    workflowExecutionIds: toWorkflowExecutionIds(conversation.metadata),
    created,
  };
};

/**
 * Reads investigation conversations in the given order, skipping ids that do not exist, are not
 * readable, or are not investigations.
 */
export const findInvestigationConversations = async (
  conversations: ConversationPublicClient,
  ids: string[]
): Promise<InvestigationConversation[]> => {
  if (ids.length === 0) {
    return [];
  }
  const found = await conversations.bulkGet(ids);
  return ids.flatMap((id) => {
    const conversation = found.get(id);
    return conversation?.template_id === INVESTIGATION_TEMPLATE_ID
      ? [toInvestigationConversation(conversation, false)]
      : [];
  });
};

/**
 * Reads an investigation conversation, or undefined when it does not exist or is not readable.
 * Throws when the id names a conversation that is not an investigation.
 */
export const findInvestigationConversation = async (
  conversations: ConversationPublicClient,
  id: string
): Promise<InvestigationConversation | undefined> => {
  const conversation = (await conversations.bulkGet([id])).get(id);
  return conversation ? toInvestigationConversation(conversation, false) : undefined;
};

/**
 * Gets the investigation conversation with this id, creating it when it does not exist yet. An
 * investigation is a public `investigation` template conversation on the Nightshift investigation
 * agent, so it is shared with everyone who can see Nightshift investigations. Concurrent callers
 * agree on one conversation, because the id is chosen by the caller.
 *
 * The conversation is created without a title, so Agent Builder stores its placeholder and
 * generates the title from the investigation's first round.
 */
export const getOrCreateInvestigationConversation = async ({
  conversations,
  id,
}: {
  conversations: ConversationPublicClient;
  id: string;
}): Promise<InvestigationConversation> => {
  const existing = await findInvestigationConversation(conversations, id);
  if (existing) {
    return existing;
  }

  try {
    const created = await conversations.create({
      id,
      agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      templateId: INVESTIGATION_TEMPLATE_ID,
      accessControl: { access_mode: ConversationAccessControlMode.Public },
    });
    return toInvestigationConversation(created, true);
  } catch (error) {
    if (!isConversationAlreadyExistsError(error)) {
      throw error;
    }
  }

  // A concurrent caller created it first, or it exists but this caller cannot read it.
  const raced = await findInvestigationConversation(conversations, id);
  if (!raced) {
    throw new InvestigationNotFoundError(id);
  }
  return raced;
};
