/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/elastic-assistant-common';
import {
  getIsConversationOwner,
  INFERENCE_CHAT_MODEL_DISABLED_FEATURE_FLAG,
  AGENT_BUILDER_ASSISTANT_ENABLED_FEATURE_FLAG,
} from '@kbn/elastic-assistant-common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsClientContract, AuthenticatedUser } from '@kbn/core/server';
import type { AIAssistantConversationsDataClient } from '../ai_assistant_data_clients/conversations';
import type { AIAssistantDataClient } from '../ai_assistant_data_clients';
import { getPrompt } from '../lib/prompt';
import { getSystemPromptFromUserConversation } from './helpers';

export interface FeatureFlags {
  inferenceChatModelDisabled: boolean;
  agentBuilderEnabled: boolean;
}

export interface ConversationMessageParams {
  agentBuilderEnabled: boolean;
  conversationId?: string;
  newMessage?: Pick<Message, 'content' | 'role'>;
  conversationsDataClient?: AIAssistantConversationsDataClient;
  currentUser?: AuthenticatedUser;
}

export interface SystemPromptParams {
  conversationsDataClient?: AIAssistantConversationsDataClient;
  promptsDataClient?: AIAssistantDataClient;
  conversationId?: string;
  promptIds?: { promptId?: string; promptGroupId?: string };
  actionsClient: ActionsClient;
  connectorId: string;
  savedObjectsClient: SavedObjectsClientContract;
}

export const getFeatureFlags = async (coreContext: {
  featureFlags?: { getBooleanValue: (flag: string, defaultValue: boolean) => Promise<boolean> };
}): Promise<FeatureFlags> => {
  const inferenceChatModelDisabled =
    (await coreContext?.featureFlags?.getBooleanValue(
      INFERENCE_CHAT_MODEL_DISABLED_FEATURE_FLAG,
      false
    )) ?? false;

  const agentBuilderEnabled =
    (await coreContext?.featureFlags?.getBooleanValue(
      AGENT_BUILDER_ASSISTANT_ENABLED_FEATURE_FLAG,
      false
    )) ?? false;

  return { inferenceChatModelDisabled, agentBuilderEnabled };
};

export const prepareConversationMessages = async ({
  agentBuilderEnabled,
  conversationId,
  newMessage,
  conversationsDataClient,
  currentUser,
}: ConversationMessageParams): Promise<Array<Pick<Message, 'content' | 'role'>>> => {
  let conversationMessages: Array<Pick<Message, 'content' | 'role'>> = [];

  if (agentBuilderEnabled) {
    // Agent builder logic: get full conversation history and save user message before execution
    if (conversationId) {
      const conversation = await conversationsDataClient?.getConversation({
        id: conversationId,
      });
      if (
        conversation &&
        !getIsConversationOwner(conversation, {
          name: currentUser?.username,
          id: currentUser?.profile_uid,
        })
      ) {
        throw new Error(
          'Updating a conversation is only allowed for the owner of the conversation.'
        );
      }

      if (conversation && conversation.messages) {
        conversationMessages = conversation.messages.map((msg) => ({
          content: msg.content,
          role: msg.role,
        }));
      }

      // Add the new message to the conversation messages
      if (newMessage) {
        conversationMessages.push(newMessage);
      }

      // Save the user message to the conversation if it exists
      if (newMessage && conversationsDataClient && conversation) {
        await conversationsDataClient.appendConversationMessages({
          existingConversation: conversation,
          messages: [
            {
              ...newMessage,
              user: {
                id: currentUser?.profile_uid,
                name: currentUser?.username,
              },
              timestamp: new Date().toISOString(),
            },
          ],
          authenticatedUser: currentUser,
        });
      }
    } else {
      // No conversation exists, just use the new message
      if (newMessage) {
        conversationMessages.push(newMessage);
      }
    }
  } else {
    // Legacy langChain logic: only use the new message, don't save before execution
    if (conversationId) {
      const conversation = await conversationsDataClient?.getConversation({
        id: conversationId,
      });
      if (
        conversation &&
        !getIsConversationOwner(conversation, {
          name: currentUser?.username,
          id: currentUser?.profile_uid,
        })
      ) {
        throw new Error(
          'Updating a conversation is only allowed for the owner of the conversation.'
        );
      }
    }

    // For langChain, only pass the new message
    if (newMessage) {
      conversationMessages.push(newMessage);
    }
  }

  return conversationMessages;
};

export const prepareSystemPrompt = async ({
  conversationsDataClient,
  promptsDataClient,
  conversationId,
  promptIds,
  actionsClient,
  connectorId,
  savedObjectsClient,
}: SystemPromptParams): Promise<string | undefined> => {
  let systemPrompt;
  if (conversationsDataClient && promptsDataClient && conversationId) {
    systemPrompt = await getSystemPromptFromUserConversation({
      conversationsDataClient,
      conversationId,
      promptsDataClient,
    });
  }
  if (promptIds?.promptId || promptIds?.promptGroupId) {
    const additionalSystemPrompt = await getPrompt({
      actionsClient,
      connectorId,
      promptId: promptIds.promptId || '',
      promptGroupId: promptIds.promptGroupId || '',
      savedObjectsClient,
    });

    systemPrompt =
      systemPrompt && systemPrompt.length
        ? `${systemPrompt}\n\n${additionalSystemPrompt}`
        : additionalSystemPrompt;
  }
  return systemPrompt;
};
