/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AuthenticatedUser, Logger } from '@kbn/core/server';

import type { ConversationResponse, Message } from '@kbn/elastic-assistant-common';
import type {
  DocumentsDataWriter,
  BulkOperationError,
} from '../../lib/data_stream/documents_data_writer';
import { transformESToConversations } from './transforms';
import type { EsConversationSchema } from './types';
import type { UpdateConversationSchema } from './update_conversation';
import { getUpdateScript } from './helpers';

export interface AppendConversationMessagesParams {
  dataWriter: DocumentsDataWriter;
  logger: Logger;
  existingConversation: ConversationResponse;
  messages: Message[];
  authenticatedUser?: AuthenticatedUser;
}

export const appendConversationMessages = async ({
  dataWriter,
  logger,
  existingConversation,
  messages,
  authenticatedUser,
}: AppendConversationMessagesParams): Promise<ConversationResponse | null> => {
  const updatedAt = new Date().toISOString();
  const params = transformToUpdateScheme(
    updatedAt,
    [...(existingConversation.messages ?? []), ...messages],
    existingConversation
  );

  const { errors, docs_updated: docsUpdated } = await dataWriter.bulk<
    UpdateConversationSchema,
    never
  >({
    documentsToUpdate: [params],
    getUpdateScript: (document: UpdateConversationSchema) =>
      getUpdateScript({ conversation: document }),
    authenticatedUser,
  });

  if (errors && errors.length > 0) {
    logger.error(
      `Error appending conversation messages: ${errors.map(
        (err: BulkOperationError) => err.message
      )} for conversation by ID: ${existingConversation.id}`
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
  messages: Message[],
  existingConversation: ConversationResponse
) => {
  return {
    id: existingConversation.id,
    updated_at: updatedAt,
    // Preserve all existing conversation fields
    ...(existingConversation.title ? { title: existingConversation.title } : {}),
    ...(existingConversation.apiConfig
      ? {
          api_config: {
            action_type_id: existingConversation.apiConfig.actionTypeId,
            connector_id: existingConversation.apiConfig.connectorId,
            default_system_prompt_id: existingConversation.apiConfig.defaultSystemPromptId,
            model: existingConversation.apiConfig.model,
            provider: existingConversation.apiConfig.provider,
          },
        }
      : {}),
    ...(existingConversation.excludeFromLastConversationStorage != null
      ? {
          exclude_from_last_conversation_storage:
            existingConversation.excludeFromLastConversationStorage,
        }
      : {}),
    ...(existingConversation.replacements
      ? {
          replacements: Object.keys(existingConversation.replacements).map((key) => ({
            uuid: key,
            value: existingConversation.replacements?.[key] ?? '',
          })),
        }
      : {}),
    // Update messages with the new combined list
    messages: messages?.map((message) => ({
      '@timestamp': message.timestamp,
      id: message.id ?? uuidv4(),
      content: message.content,
      ...(message.refusal ? { refusal: message.refusal } : {}),
      is_error: message.isError,
      reader: message.reader,
      role: message.role,
      user: message.user,
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
  };
};
