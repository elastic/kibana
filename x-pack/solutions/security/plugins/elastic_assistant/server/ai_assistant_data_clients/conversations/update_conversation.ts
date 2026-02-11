/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type {
  ConversationResponse,
  Reader,
  ConversationUpdateProps,
  Provider,
  MessageRole,
  UUID,
  ContentReferences,
} from '@kbn/elastic-assistant-common';
import { getUpdateScript } from './helpers';
import type { EsConversationSchema, EsReplacementSchema } from './types';
import type { DocumentsDataWriter } from '../../lib/data_stream/documents_data_writer';
import { transformESToConversations } from './transforms';

export interface UpdateConversationSchema {
  id: UUID;
  '@timestamp'?: string;
  title?: string;
  messages?: Array<{
    '@timestamp': string;
    id: string;
    content: string;
    refusal?: string;
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
    users,
  }: ConversationUpdateProps
): UpdateConversationSchema => {
  return {
    id,
    updated_at: updatedAt,
    ...(title ? { title } : {}),
    ...(users ? { users } : {}),
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
            id: message.id ?? uuidv4(),
            content: message.content,
            ...(message.refusal ? { refusal: message.refusal } : {}),
            is_error: message.isError,
            reader: message.reader,
            role: message.role,
            ...(message.metadata
              ? {
                  metadata: {
                    ...(message.metadata.contentReferences
                      ? { content_references: message.metadata.contentReferences }
                      : {}),
                    ...(message.metadata.interruptValue
                      ? { interrupt_value: message.metadata.interruptValue }
                      : {}),
                    ...(message.metadata.interruptResumeValue
                      ? { interrupt_resume_value: message.metadata.interruptResumeValue }
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
