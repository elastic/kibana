/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { getConversationWithNewMessage } from './get_conversation_with_new_message';
import type {
  Message,
  type ConversationResponse,
  type Replacements,
} from '@kbn/elastic-assistant-common';
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
      if (id === 'withPendingInterrupts') {
        return {
          users: [{ name: 'elastic' }],
          messages: [
            {
              content: 'first human message anonymized-value',
              role: 'user',
              timestamp: '2023-10-01T00:00:00Z',
            },
            {
              content: 'User action required',
              role: 'assistant',
              timestamp: '2023-10-01T00:00:00Z',
              metadata: {
                interruptValue: {
                  id: '111',
                  type: 'INPUT_TEXT',
                  threadId: '777',
                },
              } as Message['metadata'],
            },
            {
              content: 'User action required',
              role: 'assistant',
              timestamp: '2023-10-01T00:00:00Z',
              metadata: {
                interruptValue: {
                  id: '222',
                  type: 'INPUT_TEXT',
                  threadId: '777',
                },
              } as Message['metadata'],
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
    updateConversation: jest
      .fn()
      .mockImplementation(
        ({ conversationUpdateProps }: { conversationUpdateProps: ConversationResponse }) => {
          return conversationUpdateProps;
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
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledTimes(0);
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
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledTimes(0);
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
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledTimes(0);
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
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledTimes(1);
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledWith({
      conversationUpdateProps: {
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
          expect.objectContaining({
            content: 'Second human message original-value',
            role: 'user',
            timestamp: expect.any(String),
          }),
        ],
      },
    });
  });

  it('expires old interrupts when no resume value is provided', async () => {
    const newMessages = [new HumanMessage('Second human message anonymized-value')];
    await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: 'withPendingInterrupts',
      conversationsDataClient,
      replacements,
    });
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledWith({
      conversationUpdateProps: expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'User action required',
            role: 'assistant',
            timestamp: '2023-10-01T00:00:00Z',
            metadata: {
              interruptValue: {
                id: '111',
                expired: true,
                type: 'INPUT_TEXT',
                threadId: '777',
              },
            } as Message['metadata'],
          }),
          expect.objectContaining({
            content: 'User action required',
            role: 'assistant',
            timestamp: '2023-10-01T00:00:00Z',
            metadata: {
              interruptValue: {
                id: '222',
                expired: true,
                type: 'INPUT_TEXT',
                threadId: '777',
              },
            } as Message['metadata'],
          }),
        ]),
      }),
    });
  });

  it('expires interrupt if resume value is not the last message', async () => {
    const newMessages = [new HumanMessage('Second human message anonymized-value')];
    await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: 'withPendingInterrupts',
      conversationsDataClient,
      replacements,
      interruptResumeValue: {
        interruptId: '111',
        type: 'INPUT_TEXT',
        value: 'User action required',
      },
    });
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledWith({
      conversationUpdateProps: expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'User action required',
            role: 'assistant',
            timestamp: '2023-10-01T00:00:00Z',
            metadata: {
              interruptValue: {
                id: '111',
                expired: true,
                type: 'INPUT_TEXT',
                threadId: '777',
              },
            } as Message['metadata'],
          }),
          expect.objectContaining({
            content: 'User action required',
            role: 'assistant',
            timestamp: '2023-10-01T00:00:00Z',
            metadata: {
              interruptValue: {
                id: '222',
                expired: true,
                type: 'INPUT_TEXT',
                threadId: '777',
              },
            } as Message['metadata'],
          }),
        ]),
      }),
    });
  });

  it('expires old interrupt and adds resume value to corresponding message', async () => {
    const newMessages = [new HumanMessage('Second human message anonymized-value')];
    await getConversationWithNewMessage({
      logger,
      newMessages,
      conversationId: 'withPendingInterrupts',
      conversationsDataClient,
      replacements,
      interruptResumeValue: {
        interruptId: '222',
        type: 'INPUT_TEXT',
        value: 'User action required',
      },
    });
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledWith({
      conversationUpdateProps: expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'User action required',
            role: 'assistant',
            timestamp: '2023-10-01T00:00:00Z',
            metadata: {
              interruptValue: {
                id: '111',
                expired: true,
                type: 'INPUT_TEXT',
                threadId: '777',
              },
            } as Message['metadata'],
          }),
          expect.objectContaining({
            content: 'User action required',
            role: 'assistant',
            timestamp: '2023-10-01T00:00:00Z',
            metadata: {
              interruptValue: {
                id: '222',
                type: 'INPUT_TEXT',
                threadId: '777',
              },
              interruptResumeValue: {
                interruptId: '222',
                type: 'INPUT_TEXT',
                value: 'User action required',
              },
            } as Message['metadata'],
          }),
        ]),
      }),
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
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledWith({
      conversationUpdateProps: {
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
          expect.objectContaining({
            content: 'Second human message original-value',
            role: 'user',
            timestamp: expect.any(String),
            user: { name: 'elastic' },
          }),
        ],
        createdBy: { name: 'elastic' },
      },
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
    expect(conversationsDataClient.updateConversation).toHaveBeenCalledWith({
      conversationUpdateProps: {
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
          expect.objectContaining({
            content: 'Second human message original-value',
            role: 'user',
            timestamp: expect.any(String),
            user: { name: 'elastic' },
          }),
        ],
        users: [{ name: 'elastic' }],
      },
    });
  });
});
