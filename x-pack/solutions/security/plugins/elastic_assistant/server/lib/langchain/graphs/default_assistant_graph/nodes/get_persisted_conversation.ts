/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentState, NodeParamsBase } from '../types';
import { AIAssistantConversationsDataClient } from '../../../../../ai_assistant_data_clients/conversations';
import { getLangChainMessages } from '../../../helpers';
import { NodeType } from '../constants';

export interface GetPersistedConversationParams extends NodeParamsBase {
  conversationsDataClient?: AIAssistantConversationsDataClient;
  state: AgentState;
}

export async function getPersistedConversation({
  logger,
  state,
  conversationsDataClient,
}: GetPersistedConversationParams): Promise<Partial<AgentState>> {
  logger.debug(
    () => `${NodeType.GET_PERSISTED_CONVERSATION}: Node state:\n${JSON.stringify(state, null, 2)}`
  );

  const conversation = await conversationsDataClient?.getConversation({ id: state.conversationId });
  if (!conversation) {
    logger.debug('Requested conversation, because conversation is undefined');
    return {
      conversation: undefined,
      messages: [],
      chatTitle: '',
      lastNode: NodeType.GET_PERSISTED_CONVERSATION,
    };
  }

  logger.debug(`conversationId: ${state.conversationId}`);

  const messages = getLangChainMessages(conversation.messages ?? []);

  if (!state.input) {
    const lastMessage = messages?.splice(-1)[0];
    return {
      conversation,
      messages,
      chatTitle: conversation.title,
      input: lastMessage?.content as string,
      lastNode: NodeType.GET_PERSISTED_CONVERSATION,
    };
  }

  return {
    conversation,
    messages,
    chatTitle: conversation.title,
    lastNode: NodeType.GET_PERSISTED_CONVERSATION,
  };
}
