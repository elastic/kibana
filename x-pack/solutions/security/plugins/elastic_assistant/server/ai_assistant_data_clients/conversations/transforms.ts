/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ConversationResponse, Replacements } from '@kbn/elastic-assistant-common';
import {
  replaceOriginalValuesWithUuidValues,
  resolveConnectorId,
} from '@kbn/elastic-assistant-common';
import _ from 'lodash';
import type { EsConversationSchema } from './types';

export const transformESToConversation = (
  conversationSchema: EsConversationSchema
): ConversationResponse => {
  const replacements = conversationSchema.replacements?.reduce((acc: Record<string, string>, r) => {
    acc[r.uuid] = r.value;
    return acc;
  }, {}) as Replacements;
  const conversation: ConversationResponse = {
    timestamp: conversationSchema['@timestamp'],
    createdAt: conversationSchema.created_at,
    createdBy: conversationSchema.created_by,
    users:
      conversationSchema.users?.map((user) => ({
        id: user.id,
        name: user.name,
      })) ?? [],
    title: conversationSchema.title,
    category: conversationSchema.category,
    ...(conversationSchema.api_config
      ? {
          apiConfig: {
            // Resolve potentially outdated Elastic managed connector ID to the new one.
            // This provides backward compatibility for existing conversations that reference
            // "Elastic-Managed-LLM" or "General-Purpose-LLM-v1".
            connectorId: resolveConnectorId(conversationSchema.api_config.connector_id),
            actionTypeId: conversationSchema.api_config.action_type_id,
            defaultSystemPromptId: conversationSchema.api_config.default_system_prompt_id,
            model: conversationSchema.api_config.model,
            provider: conversationSchema.api_config.provider,
          },
        }
      : {}),
    excludeFromLastConversationStorage: conversationSchema.exclude_from_last_conversation_storage,
    messages:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conversationSchema.messages?.map((message: Record<string, any>) => ({
        timestamp: message['@timestamp'],
        ...(message.id ? { id: message.id } : {}),
        // always return anonymized data from the client
        content: replaceOriginalValuesWithUuidValues({
          messageContent: message.content,
          replacements,
        }),
        ...(message.refusal ? { refusal: message.refusal } : {}),
        ...(message.is_error ? { isError: message.is_error } : {}),
        ...(message.reader ? { reader: message.reader } : {}),
        ...(message.user ? { user: message.user } : {}),
        role: message.role,
        ...(message.metadata
          ? {
              metadata: {
                ...(message.metadata.content_references
                  ? { contentReferences: message.metadata.content_references }
                  : {}),
                ...(message.metadata.interrupt_value
                  ? { interruptValue: message.metadata.interrupt_value }
                  : {}),
                ...(message.metadata.interrupt_resume_value
                  ? { interruptResumeValue: message.metadata.interrupt_resume_value }
                  : {}),
              },
            }
          : {}),
        ...(message.trace_data
          ? {
              traceData: {
                traceId: message.trace_data?.trace_id,
                transactionId: message.trace_data?.transaction_id,
              },
            }
          : {}),
      })),
    updatedAt: conversationSchema.updated_at,
    replacements,
    namespace: conversationSchema.namespace,
    id: conversationSchema.id,
  };

  return conversation;
};

export const transformESSearchToConversations = (
  response: estypes.SearchResponse<EsConversationSchema>
): ConversationResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const conversationSchema = hit._source!;
      return transformESToConversation({
        ...conversationSchema,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: hit._id!,
      });
    });
};

export const transformESToConversations = (
  response: EsConversationSchema[]
): ConversationResponse[] => {
  return response.map((conversationSchema) => transformESToConversation(conversationSchema));
};

export const transformFieldNamesToSourceScheme = (fields: string[]) => {
  return fields.map((f) => {
    switch (f) {
      case 'timestamp':
        return '@timestamp';
      case 'apiConfig':
        return 'api_config';
      case 'createdBy':
        return 'created_by';
      case 'apiConfig.actionTypeId':
        return 'api_config.action_type_id';
      case 'apiConfig.connectorId':
        return 'api_config.connector_id';
      case 'apiConfig.defaultSystemPromptId':
        return 'api_config.default_system_prompt_id';
      case 'apiConfig.model':
        return 'api_config.model';
      case 'apiConfig.provider':
        return 'api_config.provider';
      default:
        return _.snakeCase(f);
    }
  });
};
