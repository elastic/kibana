/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { getConversationWithNewMessage } from './get_conversation_with_new_message';
import type { ConversationResponse, Message, Replacements } from '@kbn/elastic-assistant-common';
import type { AIAssistantConversationsDataClient } from '../../../ai_assistant_data_clients/conversations';
import type { Logger } from '@kbn/logging';

describe('getConversationWithNewMessage', () => {
  const replacements = {
    'anonymized-value': 'original-value',
  } as unknown as Replacements;
  const logger = { debug: jest.fn() } as unknown as Logger;
  const conversationsDataClient = {
    getConversation: jest.fn().mockImplementation(({ id }: { id: string }) => {
      if (id === 'empty') {
        return null;
      }
      if (id === 'withCreatedBy') {
        return {
          createdBy: { name: 'elastic' },
          messages: [
            {
              content: 'first human message anonymized-value',
              role: 'user',
              timestamp: '2023-10-01T00:00:00Z',
            },
            {
              content: 'first assistant message anonymized-value',
              role: 'assistant',
              timestamp: '2023-10-01T00:00:00Z',
            },
          ],
        };
      }
      if (id === 'withUsers') {
        return {
          users: [{ name: 'elastic' }],
          messages: [
            {
              content: 'first human message anonymized-value',
              role: 'user',
              timestamp: '2023-10-01T00:00:00Z',
            },
            {
              content: 'first assistant message anonymized-value',
              role: 'assistant',
              timestamp: '2023-10-01T00:00:00Z',
            },
          ],
        };
      }
      return {
        messages: [
          {
            content: 'first human message anonymized-value',
            role: 'user',
            timestamp: '2023-10-01T00:00:00Z',
          },
          {
            content: 'first assistant message anonymized-value',
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
    const newMessages = [new HumanMessage('Second human message anonymized-value')];
    const result = await getConversationWithNewMessage({
      logger,
      newMessages,
      replacements,
    });
    expect(result).toEqual(newMessages);
    expect(conversationsDataClient.getConversation).toHaveBeenCalledTimes(0);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledTimes(0);
  });

  it('when conversationDataClient is missing, just returns the new message', async () => {
    const newMessages = [new HumanMessage('Second human message anonymized-value')];
    const result = await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: '12345',
      replacements,
    });
    expect(result).toEqual(newMessages);
    expect(conversationsDataClient.getConversation).toHaveBeenCalledTimes(0);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledTimes(0);
  });

  it('when conversation does not exist, just returns the new message', async () => {
    const newMessages = [new HumanMessage('Second human message anonymized-value')];
    const result = await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: 'empty',
      conversationsDataClient,
      replacements,
    });
    expect(result).toEqual(newMessages);
    expect(conversationsDataClient.getConversation).toHaveBeenCalledTimes(1);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledTimes(0);
  });

  it('when conversation does exist, update conversation and return the new full conversation', async () => {
    const newMessages = [new HumanMessage('Second human message anonymized-value')];
    const result = await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: '12345',
      conversationsDataClient,
      replacements,
    });
    expect(result).toEqual([
      new HumanMessage('first human message anonymized-value'),
      new AIMessage('first assistant message anonymized-value'),
      new HumanMessage('Second human message anonymized-value'),
    ]);
    expect(conversationsDataClient.getConversation).toHaveBeenCalledTimes(1);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledTimes(1);
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledWith({
      existingConversation: {
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'first human message anonymized-value',
            role: 'user',
            timestamp: expect.any(String),
          }),
          expect.objectContaining({
            content: 'first assistant message anonymized-value',
            role: 'assistant',
            timestamp: expect.any(String),
          }),
        ]),
      },
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: 'Second human message original-value',
          role: 'user',
          timestamp: expect.any(String),
        }),
      ]),
    });
  });

  it('when createdBy exists in conversation, update conversation messages with user', async () => {
    const newMessages = [new HumanMessage('Second human message anonymized-value')];
    await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: 'withCreatedBy',
      conversationsDataClient,
      replacements,
    });
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledWith({
      existingConversation: {
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'first human message anonymized-value',
            role: 'user',
            timestamp: expect.any(String),
          }),
          expect.objectContaining({
            content: 'first assistant message anonymized-value',
            role: 'assistant',
            timestamp: expect.any(String),
          }),
        ]),
        createdBy: { name: 'elastic' },
      },
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: 'Second human message original-value',
          role: 'user',
          timestamp: expect.any(String),
          user: { name: 'elastic' },
        }),
      ]),
    });
  });

  it('when legacy conversation exists, update conversation messages with user', async () => {
    const newMessages = [new HumanMessage('Second human message anonymized-value')];
    await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: 'withUsers',
      conversationsDataClient,
      replacements,
    });
    expect(conversationsDataClient.appendConversationMessages).toHaveBeenCalledWith({
      existingConversation: {
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'first human message anonymized-value',
            role: 'user',
            timestamp: expect.any(String),
          }),
          expect.objectContaining({
            content: 'first assistant message anonymized-value',
            role: 'assistant',
            timestamp: expect.any(String),
          }),
        ]),
        users: [{ name: 'elastic' }],
      },
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: 'Second human message original-value',
          role: 'user',
          timestamp: expect.any(String),
          user: { name: 'elastic' },
        }),
      ]),
    });
  });
});
