/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { promptGroupId } from '../../prompt/local_prompt_object';
import { getPrompt, promptDictionary } from '../../prompt';

interface Params {
  llmType?: string;
  connectorId: string;
  savedObjectsClient: SavedObjectsClientContract;
  actionsClient: PublicMethodsOf<ActionsClient>;
  messages: BaseMessage[];
}

/**
 * Apply enrichments to a conversation
 */
export const enrichConversation = (params: Params) => {
  const userPromptEnricher = getUserPrompt(params);
  return userPromptEnricher(params.messages);
};

/**
 * Prepends the user prompt to the last message if the last message is a human message.
 */
const getUserPrompt = (
  params: Pick<Params, 'actionsClient' | 'savedObjectsClient' | 'connectorId' | 'llmType'>
) => {
  return async (messages: BaseMessage[]): Promise<BaseMessage[]> => {
    const userPrompt =
      params.llmType === 'gemini'
        ? await getPrompt({
            actionsClient: params.actionsClient,
            connectorId: params.connectorId,
            promptId: promptDictionary.userPrompt,
            promptGroupId: promptGroupId.aiAssistant,
            provider: 'gemini',
            savedObjectsClient: params.savedObjectsClient,
          })
        : '';

    if (!userPrompt || messages.length < 1) {
      return messages;
    }

    const messagesCopy = [...messages]; // Create a copy to avoid mutating the original messages
    const lastMessage = messagesCopy[messagesCopy.length - 1];
    if (lastMessage instanceof HumanMessage) {
      messagesCopy[messagesCopy.length - 1] = new HumanMessage(
        `${userPrompt} ${lastMessage.content}`.trim(),
        lastMessage.additional_kwargs
      );
    }
    return messagesCopy;
  };
};
