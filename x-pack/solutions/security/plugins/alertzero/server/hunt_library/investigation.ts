/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import {
  agentBuilderDefaultAgentId,
  ConversationAccessControlMode,
  isConversationAlreadyExistsError,
  isConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { TEMPLATE_ID_INVESTIGATION } from '@kbn/alertzero-common';

/**
 * Fixed namespace UUID for Hunt Library Investigation conversation ids. Arbitrary but frozen:
 * changing it renames every Investigation, so a retried preservation would create a second one.
 */
const HUNT_LIBRARY_INVESTIGATION_UUID_NAMESPACE = '0d7f3b52-8e1c-5a64-b9d0-4c2e7a1f6b83';

/** One Investigation per analyst hunt session: space, hunt definition and session id. */
export const deriveManualInvestigationId = ({
  spaceId,
  definitionId,
  sessionId,
}: {
  spaceId: string;
  definitionId: string;
  sessionId: string;
}): string =>
  uuidv5(
    `hunt_library:manual:${spaceId}|${definitionId}|${sessionId}`,
    HUNT_LIBRARY_INVESTIGATION_UUID_NAMESPACE
  );

/** One Investigation per automated occurrence group, however its citations are ordered. */
export const deriveAutomatedInvestigationId = ({
  spaceId,
  groupId,
}: {
  spaceId: string;
  groupId: string;
}): string =>
  uuidv5(`hunt_library:automated:${spaceId}|${groupId}`, HUNT_LIBRARY_INVESTIGATION_UUID_NAMESPACE);

export interface FindOrCreateHuntInvestigationResult {
  investigationId: string;
  /** True only when this call created the conversation. */
  created: boolean;
}

/**
 * Creates the Investigation conversation with a caller-chosen id, or finds the one that already
 * exists. A create conflict is read back to confirm the conversation is reachable before it counts as
 * found. The Investigation is public: it belongs to whoever is on duty, not to the identity that
 * preserved the evidence.
 */
export const findOrCreateHuntInvestigation = async ({
  conversations,
  investigationId,
  title,
}: {
  conversations: Pick<ConversationPublicClient, 'create' | 'get'>;
  investigationId: string;
  title: string;
}): Promise<FindOrCreateHuntInvestigationResult> => {
  try {
    await conversations.create({
      id: investigationId,
      agentId: agentBuilderDefaultAgentId,
      title,
      templateId: TEMPLATE_ID_INVESTIGATION,
      accessControl: { access_mode: ConversationAccessControlMode.Public, entries: [] },
    });
    return { investigationId, created: true };
  } catch (error) {
    if (!isConversationAlreadyExistsError(error)) throw error;
    await conversations.get(investigationId);
    return { investigationId, created: false };
  }
};

export type DeleteEmptyInvestigationOutcome =
  | 'deleted'
  | 'not_found'
  | 'not_created_here'
  | 'not_empty';

/**
 * Compensation for a first attachment write that failed after this request created the
 * Investigation. It deletes only when this request created the conversation and a fresh read shows no
 * rounds and no active attachments, so it never removes a pre-existing or worked-on Investigation.
 * The read and the delete are not atomic: for a conversation created moments ago the window is small,
 * and an Investigation left empty by a failed delete is cleaned up later.
 */
export const deleteEmptyCreatedInvestigation = async ({
  conversations,
  investigationId,
  createdByThisRequest,
}: {
  conversations: Pick<ConversationPublicClient, 'get' | 'delete'>;
  investigationId: string;
  createdByThisRequest: boolean;
}): Promise<DeleteEmptyInvestigationOutcome> => {
  if (!createdByThisRequest) return 'not_created_here';

  let conversation;
  try {
    conversation = await conversations.get(investigationId);
  } catch (error) {
    if (isConversationNotFoundError(error)) return 'not_found';
    throw error;
  }

  const hasActiveAttachments = (conversation.attachments ?? []).some(
    (attachment) => attachment.active !== false
  );
  if (conversation.rounds.length > 0 || hasActiveAttachments) return 'not_empty';

  await conversations.delete(investigationId);
  return 'deleted';
};
