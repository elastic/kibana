/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  ConversationResponse,
  Replacements,
  replaceOriginalValuesWithUuidValues,
} from '@kbn/elastic-assistant-common';
import { EsConversationSchema } from './types';

export const transformESSearchToConversations = (
  response: estypes.SearchResponse<EsConversationSchema>
): ConversationResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const conversationSchema = hit._source!;
      const conversation: ConversationResponse = {
        timestamp: conversationSchema['@timestamp'],
        createdAt: conversationSchema.created_at,
        users:
          conversationSchema.users?.map((user) => ({
            id: user.id,
            name: user.name,
          })) ?? [],
        title: conversationSchema.title,
        category: conversationSchema.category,
        summary: conversationSchema.summary,
        ...(conversationSchema.api_config
          ? {
              apiConfig: {
                connectorId: conversationSchema.api_config.connector_id,
                actionTypeId: conversationSchema.api_config.action_type_id,
                defaultSystemPromptId: conversationSchema.api_config.default_system_prompt_id,
                model: conversationSchema.api_config.model,
                provider: conversationSchema.api_config.provider,
              },
            }
          : {}),
        excludeFromLastConversationStorage:
          conversationSchema.exclude_from_last_conversation_storage,
        isDefault: conversationSchema.is_default,
        messages:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          conversationSchema.messages?.map((message: Record<string, any>) => ({
            timestamp: message['@timestamp'],
            // always return anonymized data from the client
            content: conversationSchema.replacements
              ? replaceOriginalValuesWithUuidValues({
                  messageContent: message.content,
                  replacements: conversationSchema.replacements?.reduce(
                    (acc: Record<string, string>, r) => {
                      acc[r.uuid] = r.value;
                      return acc;
                    },
                    {}
                  ),
                })
              : message.content,
            ...(message.is_error ? { isError: message.is_error } : {}),
            ...(message.reader ? { reader: message.reader } : {}),
            role: message.role,
            ...(message.metadata
              ? {
                  metadata: {
                    ...(message.metadata.content_references
                      ? { contentReferences: message.metadata.content_references }
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
          })) ?? [],
        updatedAt: conversationSchema.updated_at,
        replacements: conversationSchema.replacements?.reduce((acc: Record<string, string>, r) => {
          acc[r.uuid] = r.value;
          return acc;
        }, {}),
        namespace: conversationSchema.namespace,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: hit._id!,
      };

      return conversation;
    });
};

export const transformESToConversations = (
  response: EsConversationSchema[]
): ConversationResponse[] => {
  return response.map((conversationSchema) => {
    const replacements = conversationSchema.replacements?.reduce(
      (acc: Record<string, string>, r) => {
        acc[r.uuid] = r.value;
        return acc;
      },
      {}
    ) as Replacements;
    const conversation: ConversationResponse = {
      timestamp: conversationSchema['@timestamp'],
      createdAt: conversationSchema.created_at,
      users:
        conversationSchema.users?.map((user) => ({
          id: user.id,
          name: user.name,
        })) ?? [],
      title: conversationSchema.title,
      category: conversationSchema.category,
      summary: conversationSchema.summary,
      ...(conversationSchema.api_config
        ? {
            apiConfig: {
              actionTypeId: conversationSchema.api_config.action_type_id,
              connectorId: conversationSchema.api_config.connector_id,
              defaultSystemPromptId: conversationSchema.api_config.default_system_prompt_id,
              model: conversationSchema.api_config.model,
              provider: conversationSchema.api_config.provider,
            },
          }
        : {}),
      excludeFromLastConversationStorage: conversationSchema.exclude_from_last_conversation_storage,
      isDefault: conversationSchema.is_default,
      messages:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conversationSchema.messages?.map((message: Record<string, any>) => ({
          timestamp: message['@timestamp'],
          // always return anonymized data from the client
          content: replaceOriginalValuesWithUuidValues({
            messageContent: message.content,
            replacements,
          }),
          ...(message.is_error ? { isError: message.is_error } : {}),
          ...(message.reader ? { reader: message.reader } : {}),
          role: message.role,
          ...(message.trace_data
            ? {
                traceData: {
                  traceId: message.trace_data?.trace_id,
                  transactionId: message.trace_data?.transaction_id,
                },
              }
            : {}),
        })) ?? [],
      updatedAt: conversationSchema.updated_at,
      replacements,
      namespace: conversationSchema.namespace,
      id: conversationSchema.id,
    };

    return conversation;
  });
};
