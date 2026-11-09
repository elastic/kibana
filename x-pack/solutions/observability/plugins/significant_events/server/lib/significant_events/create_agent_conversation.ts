/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  CONVERSATION_TITLE_MAX_LENGTH,
  ConversationAccessControlMode,
} from '@kbn/agent-builder-common';

/**
 * Creates the public, pre-titled conversation an `ai.agent` step then runs in. A conversation
 * the step creates itself carries the placeholder title, which makes Agent Builder spend an extra
 * LLM call on a generated one, on a model Nightshift did not pick.
 */
export async function createAgentConversation({
  agentBuilder,
  request,
  agentId,
  title,
}: {
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  agentId: string;
  title: string;
}): Promise<string> {
  const conversationClient = await agentBuilder.conversations.getScopedClient({ request });
  const conversation = await conversationClient.create({
    agentId,
    title: title.slice(0, CONVERSATION_TITLE_MAX_LENGTH),
    accessControl: { access_mode: ConversationAccessControlMode.Public },
  });
  return conversation.id;
}
