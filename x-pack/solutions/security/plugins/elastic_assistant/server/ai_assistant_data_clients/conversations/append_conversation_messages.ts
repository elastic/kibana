/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

import { ConversationResponse, Message } from '@kbn/elastic-assistant-common';
import { getConversation } from './get_conversation';

export interface AppendConversationMessagesParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  conversationIndex: string;
  existingConversation: ConversationResponse;
  messages: Message[];
}

export const appendConversationMessages = async ({
  esClient,
  logger,
  conversationIndex,
  existingConversation,
  messages,
}: AppendConversationMessagesParams): Promise<ConversationResponse | null> => {
  const updatedAt = new Date().toISOString();

  const params = transformToUpdateScheme(updatedAt, [
    ...(existingConversation.messages ?? []),
    ...messages,
  ]);
  try {
    const response = await esClient.updateByQuery({
      conflicts: 'proceed',
      index: conversationIndex,
      query: {
        ids: {
          values: [existingConversation.id ?? ''],
        },
      },
      refresh: true,
      script: {
        lang: 'painless',
        params: {
          ...params,
        },
        source: `
          if (params.assignEmpty == true || params.containsKey('messages')) {
            def messages = [];
            for (message in params.messages) {
              def newMessage = [:];
              newMessage['@timestamp'] = message['@timestamp'];
              newMessage.content = message.content;
              newMessage.is_error = message.is_error;
              newMessage.reader = message.reader;
              newMessage.role = message.role;
              if (message.trace_data != null) {
                newMessage.trace_data = message.trace_data;
              }
              if (message.metadata != null) {
                newMessage.metadata = message.metadata;
              }
              messages.add(newMessage);
            }
            ctx._source.messages = messages;
          }
          ctx._source.updated_at = params.updated_at;
        `,
      },
    });
    if (response.failures && response.failures.length > 0) {
      logger.error(
        `Error appending conversation messages: ${response.failures.map(
          (f) => f.id
        )} for conversation by ID: ${existingConversation.id}`
      );
      return null;
    }

    const updatedConversation = await getConversation({
      esClient,
      conversationIndex,
      id: existingConversation.id,
      logger,
    });
    return updatedConversation;
  } catch (err) {
    logger.error(
      `Error appending conversation messages: ${err} for conversation by ID: ${existingConversation.id}`
    );
    throw err;
  }
};

export const transformToUpdateScheme = (updatedAt: string, messages: Message[]) => {
  return {
    updated_at: updatedAt,
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
