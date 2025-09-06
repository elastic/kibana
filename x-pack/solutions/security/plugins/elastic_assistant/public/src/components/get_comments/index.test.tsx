/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MessageRole } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { getComments } from '.';

const user: MessageRole = 'user';
const currentConversation = {
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
    provider: OpenAiProviderType.OpenAi,
  },
  replacements: {},
  category: 'assistant',
  id: '1',
  title: '1',
  createdBy: { name: 'elastic' },
  createdAt: '2024-03-19T18:59:18.174',
  users: [{ name: 'elastic' }],
  messages: [
    {
      role: user,
      content: 'Hello {name}',
      timestamp: '2024-03-19T18:59:18.174Z',
      isError: false,
    },
  ],
};
const showAnonymizedValues = false;
const testProps = {
  abortStream: jest.fn(),
  contentReferencesVisible: true,
  currentConversation,
  isConversationOwner: true,
  isFetchingResponse: false,
  refetchCurrentConversation: jest.fn(),
  regenerateMessage: jest.fn(),
  setIsStreaming: jest.fn(),
  showAnonymizedValues,
};
describe('getComments', () => {
  it('Does not add error state message has no error', () => {
    const result = getComments({ CommentActions: () => null })(testProps);
    expect(result[0].eventColor).toEqual(undefined);
  });
  it('Adds error state when message has error', () => {
    const result = getComments({ CommentActions: () => null })({
      ...testProps,
      currentConversation: {
        category: 'assistant',
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
          provider: OpenAiProviderType.OpenAi,
        },
        replacements: {},
        id: '1',
        title: '1',
        messages: [
          {
            role: user,
            content: 'Hello {name}',
            timestamp: '2022-01-01',
            isError: true,
          },
        ],
        users: [{ name: 'elastic' }],
        createdAt: '2022-03-19T18:59:18.174Z',
        createdBy: { name: 'elastic' },
      },
    });
    expect(result[0].eventColor).toEqual('danger');
  });

  it('It transforms message timestamp from server side ISO format to local date string', () => {
    const result = getComments({ CommentActions: () => null })(testProps);
    expect(result[0].timestamp).toEqual(
      `at: ${new Date('2024-03-19T18:59:18.174Z').toLocaleString()}`
    );
  });

  it('Displays controls on last comment when isConversationOwner', () => {
    const newTestProps = {
      ...testProps,
      currentConversation: {
        ...currentConversation,
        messages: [
          {
            role: user,
            content: 'Hello {name}',
            timestamp: '2024-03-19T18:59:18.174Z',
            isError: false,
          },
          {
            role: 'assistant' as MessageRole,
            content: 'Hello elastic',
            timestamp: '2024-03-19T18:59:18.174Z',
            isError: false,
          },
        ],
      },
    };
    const result = getComments({ CommentActions: () => null })(newTestProps);
    expect((result[1].children as React.ReactElement)?.props.isControlsEnabled).toEqual(true);
  });

  it('Hides controls on last comment when isConversationOwner=false', () => {
    const newTestProps = {
      ...testProps,
      isConversationOwner: false,
      currentConversation: {
        ...currentConversation,
        messages: [
          {
            role: user,
            content: 'Hello {name}',
            timestamp: '2024-03-19T18:59:18.174Z',
            isError: false,
          },
          {
            role: 'assistant' as MessageRole,
            content: 'Hello elastic',
            timestamp: '2024-03-19T18:59:18.174Z',
            isError: false,
          },
        ],
      },
    };
    const result = getComments({ CommentActions: () => null })(newTestProps);
    expect((result[1].children as React.ReactElement)?.props.isControlsEnabled).toEqual(false);
  });

  it('isLastInConversation is true for the last message', () => {
    const newTestProps = {
      ...testProps,
      isConversationOwner: false,
      currentConversation: {
        ...currentConversation,
        messages: [
          {
            role: user,
            content: 'Hello {name}',
            timestamp: '2024-03-19T18:59:18.174Z',
            isError: false,
          },
          {
            role: 'assistant' as MessageRole,
            content: 'Hello elastic',
            timestamp: '2024-03-19T18:59:18.174Z',
            isError: false,
          },
          {
            role: 'assistant' as MessageRole,
            content: 'Hello world',
            timestamp: '2024-03-19T18:59:18.174Z',
            isError: false,
          },
        ],
      },
    };
    const result = getComments({ CommentActions: () => null })(newTestProps);
    expect((result[0].children as React.ReactElement)?.props.isLastInConversation).toEqual(false);
    expect((result[1].children as React.ReactElement)?.props.isLastInConversation).toEqual(false);
    expect((result[2].children as React.ReactElement)?.props.isLastInConversation).toEqual(true);
  });
});
