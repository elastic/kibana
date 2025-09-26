/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser, Logger } from '@kbn/core/server';
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
import { getUpdateScript } from './helpers';
import { EsConversationSchema, EsReplacementSchema } from './types';
import type { DocumentsDataWriter } from '../../lib/data_stream/documents_data_writer';
import { transformESToConversations } from './transforms';

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
  conversationUpdateProps: ConversationUpdateProps;
  dataWriter: DocumentsDataWriter;
  logger: Logger;
  user?: AuthenticatedUser;
}

export const updateConversation = async ({
  conversationUpdateProps,
  dataWriter,
  logger,
  user,
}: UpdateConversationParams): Promise<ConversationResponse | null> => {
  const updatedAt = new Date().toISOString();
  const params = transformToUpdateScheme(updatedAt, conversationUpdateProps);

  const { errors, docs_updated: docsUpdated } = await dataWriter.bulk({
    documentsToUpdate: [params],
    getUpdateScript: (document: UpdateConversationSchema) =>
      getUpdateScript({ conversation: document }),
    authenticatedUser: user,
  });

  if (errors && errors.length > 0) {
    logger.warn(
      `Error updating conversation: ${errors.map((err) => err.message)} by ID: ${params.id}`
    );
    return null;
  }

  const updatedConversation = transformESToConversations(
    docsUpdated as EsConversationSchema[]
  )?.[0];

  return updatedConversation;
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
    ...(title ? { title } : {}),
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
    ...(excludeFromLastConversationStorage != null
      ? {
          exclude_from_last_conversation_storage: excludeFromLastConversationStorage,
        }
      : {}),
    ...(replacements
      ? {
          replacements: Object.keys(replacements).map((key) => ({
            uuid: key,
            value: replacements[key],
          })),
        }
      : {}),
    ...(messages
      ? {
          messages: messages.map((message) => ({
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
        }
      : {}),
  };
};
