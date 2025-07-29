/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { getConversationWithNewMessage } from './get_conversation_with_new_message';
import { ConversationResponse, Message } from '@kbn/elastic-assistant-common';
import { AIAssistantConversationsDataClient } from '../../../ai_assistant_data_clients/conversations';
import type { Logger } from '@kbn/logging';

describe('getConversationWithNewMessage', () => {
  const logger = { debug: jest.fn() } as unknown as Logger;
  const conversationsDataClient = {
    getConversation: jest.fn().mockImplementation(({ id }: { id: string }) => {
      if (id === 'empty') {
        return null;
      }
      return {
        messages: [
          {
            content: 'first human message',
            role: 'user',
            timestamp: '2023-10-01T00:00:00Z',
          },
          {
            content: 'first assistant message',
            role: 'assistant',
            timestamp: '2023-10-01T00:00:00Z',
          },
        ],
      };
    }),
    appendConversationMessages: jest
      .fn()
      .mockImplementation(
        ({
          existingConversation,
          messages,
        }: {
          existingConversation: ConversationResponse;
          messages: Message[];
        }) => {
          return {
            ...existingConversation,
            messages: [...(existingConversation.messages ?? []), ...messages],
          };
        }
      ),
  } as unknown as AIAssistantConversationsDataClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('when conversationId is missing, just returns the new message', async () => {
    const newMessages = [new HumanMessage('Second human message')] as BaseMessage[];
    const result = await getConversationWithNewMessage({
      logger,
      newMessages,
    });
    expect(result).toEqual(newMessages);
    expect(conversationsDataClient.getConversation).toHaveBeenCalledTimes(0);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledTimes(0);
  });

  it('when conversationDataClient is missing, just returns the new message', async () => {
    const newMessages = [new HumanMessage('Second human message')] as BaseMessage[];
    const result = await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: '12345',
    });
    expect(result).toEqual(newMessages);
    expect(conversationsDataClient.getConversation).toHaveBeenCalledTimes(0);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledTimes(0);
  });

  it('when conversation does not exist, just returns the new message', async () => {
    const newMessages = [new HumanMessage('Second human message')] as BaseMessage[];
    const result = await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: 'empty',
      conversationsDataClient,
    });
    expect(result).toEqual(newMessages);
    expect(conversationsDataClient.getConversation).toHaveBeenCalledTimes(1);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledTimes(0);
  });

  it('when conversation does exist, update conversation and return the new full conversation', async () => {
    const newMessages = [new HumanMessage('Second human message')] as BaseMessage[];
    const result = await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: '12345',
      conversationsDataClient,
    });
    expect(result).toEqual([
      new HumanMessage('first human message'),
      new AIMessage('first assistant message'),
      new HumanMessage('Second human message'),
    ]);
    expect(conversationsDataClient.getConversation).toHaveBeenCalledTimes(1);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledTimes(1);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledWith({
      existingConversation: {
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'first human message',
            role: 'user',
            timestamp: expect.any(String),
          }),
          expect.objectContaining({
            content: 'first assistant message',
            role: 'assistant',
            timestamp: expect.any(String),
          }),
        ]),
      },
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: 'Second human message',
          role: 'user',
          timestamp: expect.any(String),
        }),
      ]),
    });
  });
});
