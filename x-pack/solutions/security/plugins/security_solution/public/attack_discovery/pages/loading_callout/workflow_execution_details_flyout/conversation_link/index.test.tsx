/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { useKibana } from '../../../../../common/lib/kibana';
import { ConversationLink } from '.';

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

const mockGetUrlForApp = jest.fn();
const mockUseKibana = useKibana as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockUseKibana.mockReturnValue({
    services: {
      application: {
        getUrlForApp: mockGetUrlForApp,
      },
    },
  });

  mockGetUrlForApp.mockImplementation((appId: string, options?: { path?: string }) => {
    return `http://localhost:5601/app/${appId}${options?.path ?? ''}`;
  });
});

describe('ConversationLink', () => {
  it('renders the open conversation link', () => {
    render(
      <TestProviders>
        <ConversationLink conversationId="conversation-123" />
      </TestProviders>
    );

    expect(screen.getByTestId('openConversationLink')).toBeInTheDocument();
  });

  it('renders the open conversation label', () => {
    render(
      <TestProviders>
        <ConversationLink conversationId="conversation-123" />
      </TestProviders>
    );

    expect(screen.getByTestId('openConversationLink')).toHaveTextContent('Open conversation');
  });

  it('builds the href via the legacy conversation path of the Agent Builder app', () => {
    render(
      <TestProviders>
        <ConversationLink conversationId="conversation-123" />
      </TestProviders>
    );

    expect(screen.getByTestId('openConversationLink')).toHaveAttribute(
      'href',
      'http://localhost:5601/app/agent_builder/conversations/conversation-123'
    );
  });

  it('encodes the conversation id in the href', () => {
    render(
      <TestProviders>
        <ConversationLink conversationId="conversation/123" />
      </TestProviders>
    );

    expect(screen.getByTestId('openConversationLink')).toHaveAttribute(
      'href',
      'http://localhost:5601/app/agent_builder/conversations/conversation%2F123'
    );
  });

  it('opens the link in a new tab', () => {
    render(
      <TestProviders>
        <ConversationLink conversationId="conversation-123" />
      </TestProviders>
    );

    expect(screen.getByTestId('openConversationLink')).toHaveAttribute('target', '_blank');
  });

  it('renders nothing when getUrlForApp throws (Agent Builder app not registered)', () => {
    mockGetUrlForApp.mockImplementation(() => {
      throw new Error('app not registered');
    });

    const { container } = render(
      <TestProviders>
        <ConversationLink conversationId="conversation-123" />
      </TestProviders>
    );

    expect(container.firstChild).toBeNull();
  });
});
