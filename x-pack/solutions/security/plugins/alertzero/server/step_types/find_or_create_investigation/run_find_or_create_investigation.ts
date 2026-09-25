/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  DEFAULT_CONVERSATION_TITLE,
  isConversationAlreadyExistsError,
} from '@kbn/agent-builder-common';
import { buildHuntInvestigationConversationId } from '../../services/watches/hunt/common/hunt_investigation_id';
import { HUNT_INVESTIGATION_TEMPLATE_ID } from '../../conversation_templates/hunt_investigation';
import type { FindOrCreateInvestigationOutput } from '../../../common/step_types/find_or_create_investigation';

/**
 * Narrow slice of `ConversationPublicClient` this step needs (the client actually
 * injected at the call site is the public, camelCase wrapper, not the internal
 * snake_case `ConversationClient`), kept separate from the real type so the
 * business logic below is testable without mocking the full client.
 */
export interface FindOrCreateConversationClient {
  create: (request: {
    id: string;
    agentId: string;
    title: string;
    templateId: string;
  }) => Promise<unknown>;
  get: (conversationId: string) => Promise<unknown>;
}

export interface RunFindOrCreateInvestigationDeps {
  conversationClient: FindOrCreateConversationClient;
}

/**
 * Mints the deterministic Investigation id for a report and creates the conversation.
 * A verified 409 (the Investigation already exists for this subject key) is success:
 * per section C's retry-then-verify rule, the existing conversation is read back to
 * confirm it is reachable before the conflict is treated as success, rather than
 * trusting the create-time race alone.
 */
export const runFindOrCreateInvestigation = async (
  { reportId }: { reportId: string },
  { conversationClient }: RunFindOrCreateInvestigationDeps
): Promise<FindOrCreateInvestigationOutput> => {
  const investigationConversationId = buildHuntInvestigationConversationId(reportId);

  try {
    await conversationClient.create({
      id: investigationConversationId,
      agentId: agentBuilderDefaultAgentId,
      title: `${DEFAULT_CONVERSATION_TITLE}: Hunt Watch ${reportId}`,
      templateId: HUNT_INVESTIGATION_TEMPLATE_ID,
    });
  } catch (error) {
    if (!isConversationAlreadyExistsError(error)) {
      throw error;
    }
    await conversationClient.get(investigationConversationId);
  }

  return { investigationConversationId };
};
