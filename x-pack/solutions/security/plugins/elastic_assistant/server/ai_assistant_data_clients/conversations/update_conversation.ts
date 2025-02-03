/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ConversationResponse,
  Reader,
  ConversationUpdateProps,
  Provider,
  MessageRole,
  ConversationSummary,
  UUID,
  ContentReferences,
} from '@kbn/elastic-assistant-common';
import { getConversation } from './get_conversation';
import { getUpdateScript } from './helpers';
import { EsReplacementSchema } from './types';

export interface UpdateConversationSchema {
  id: UUID;
  '@timestamp'?: string;
  title?: string;
  messages?: Array<{
    '@timestamp': string;
    content: string;
    reader?: Reader;
    role: MessageRole;
    is_error?: boolean;
    trace_data?: {
      transaction_id?: string;
      trace_id?: string;
    };
    metadata?: {
      content_references?: ContentReferences;
    };
  }>;
  api_config?: {
    action_type_id?: string;
    connector_id?: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  summary?: ConversationSummary;
  exclude_from_last_conversation_storage?: boolean;
  replacements?: EsReplacementSchema[];
  updated_at?: string;
}

export interface UpdateConversationParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  user?: AuthenticatedUser;
  conversationIndex: string;
  conversationUpdateProps: ConversationUpdateProps;
  isPatch?: boolean;
}

export const updateConversation = async ({
  esClient,
  logger,
  conversationIndex,
  conversationUpdateProps,
  isPatch,
  user,
}: UpdateConversationParams): Promise<ConversationResponse | null> => {
  const updatedAt = new Date().toISOString();
  const params = transformToUpdateScheme(updatedAt, conversationUpdateProps);

  try {
    const response = await esClient.updateByQuery({
      conflicts: 'proceed',
      index: conversationIndex,
      query: {
        ids: {
          values: [params.id],
        },
      },
      refresh: true,
      script: getUpdateScript({ conversation: params, isPatch }).script,
    });

    if (response.failures && response.failures.length > 0) {
      logger.warn(
        `Error updating conversation: ${response.failures.map((f) => f.id)} by ID: ${params.id}`
      );
      return null;
    }

    const updatedConversation = await getConversation({
      esClient,
      conversationIndex,
      id: params.id,
      logger,
      user,
    });
    return updatedConversation;
  } catch (err) {
    logger.warn(`Error updating conversation: ${err} by ID: ${params.id}`);
    throw err;
  }
};

export const transformToUpdateScheme = (
  updatedAt: string,
  {
    title,
    apiConfig,
    excludeFromLastConversationStorage,
    messages,
    replacements,
    id,
  }: ConversationUpdateProps
): UpdateConversationSchema => {
  return {
    id,
    updated_at: updatedAt,
    title,
    ...(apiConfig
      ? {
          api_config: {
            action_type_id: apiConfig?.actionTypeId,
            connector_id: apiConfig?.connectorId,
            default_system_prompt_id: apiConfig?.defaultSystemPromptId,
            model: apiConfig?.model,
            provider: apiConfig?.provider,
          },
        }
      : {}),
    exclude_from_last_conversation_storage: excludeFromLastConversationStorage,
    replacements: replacements
      ? Object.keys(replacements).map((key) => ({
          uuid: key,
          value: replacements[key],
        }))
      : undefined,
    messages: messages?.map((message) => ({
      '@timestamp': message.timestamp,
      content: message.content,
      is_error: message.isError,
      reader: message.reader,
      role: message.role,
      ...(message.metadata
        ? {
            metadata: {
              ...(message.metadata.contentReferences
                ? { content_references: message.metadata.contentReferences }
                : {}),
            },
          }
        : {}),
      ...(message.traceData
        ? {
            trace_data: {
              trace_id: message.traceData.traceId,
              transaction_id: message.traceData.transactionId,
            },
          }
        : {}),
    })),
  };
};
