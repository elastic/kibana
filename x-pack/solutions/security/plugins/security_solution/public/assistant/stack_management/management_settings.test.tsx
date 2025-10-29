/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { ManagementSettings } from './management_settings';
import type { Conversation } from '@kbn/elastic-assistant';
import { useAssistantContext, useFetchCurrentUserConversations } from '@kbn/elastic-assistant';
import { useKibana } from '../../common/lib/kibana';
import { useConversation } from '@kbn/elastic-assistant/impl/assistant/use_conversation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the necessary hooks and components
jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: jest.fn(),
  useFetchCurrentUserConversations: jest.fn(),
  Welcome: 'Welcome Conversation',
}));
jest.mock('@kbn/elastic-assistant/impl/assistant/settings/assistant_settings_management', () => ({
  AssistantSettingsManagement: jest.fn(() => <div data-test-subj="AssistantSettingsManagement" />),
}));
jest.mock('@kbn/elastic-assistant/impl/assistant/use_conversation', () => ({
  useConversation: jest.fn(),
}));
jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

const useAssistantContextMock = useAssistantContext as jest.Mock;
const useFetchCurrentUserConversationsMock = useFetchCurrentUserConversations as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const useConversationMock = useConversation as jest.Mock;

describe('ManagementSettings', () => {
  const queryClient = new QueryClient();
  const http = {};
  const getDefaultConversation = jest.fn();
  const setCurrentUserAvatar = jest.fn();
  const navigateToApp = jest.fn();
  const mockConversations = {
    Welcome: {
      title: 'Welcome',
      id: 'Welcome',
      messages: [],
      replacements: {},
      category: 'assistant',
    },
  } as unknown as Record<string, Conversation>;

  const renderComponent = ({
    isAssistantEnabled = true,
    conversations,
  }: {
    isAssistantEnabled?: boolean;
    conversations: Record<string, Conversation>;
  }) => {
    useAssistantContextMock.mockReturnValue({
      http,
      assistantAvailability: { isAssistantEnabled, isAssistantVisible: isAssistantEnabled },
      setCurrentUserAvatar,
    });

    useFetchCurrentUserConversationsMock.mockReturnValue({
      data: conversations,
    });

    useKibanaMock.mockReturnValue({
      services: {
        application: {
          navigateToApp,
          capabilities: {
            securitySolutionAssistant: { 'ai-assistant': false },
          },
        },
        chrome: {
          docTitle: {
            change: jest.fn(),
          },
          setBreadcrumbs: jest.fn(),
        },
        data: {
          dataViews: {
            getIndices: jest.fn(),
          },
        },
        security: {
          userProfiles: {
            getCurrent: jest.fn().mockResolvedValue({ data: { color: 'blue', initials: 'P' } }),
          },
        },
      },
    });

    useConversationMock.mockReturnValue({
      getDefaultConversation,
    });

    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ManagementSettings />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to home if securityAIAssistant is disabled', () => {
    renderComponent({
      conversations: mockConversations,
    });
    expect(navigateToApp).toHaveBeenCalledWith('home');
  });

  it('renders AssistantSettingsManagement when conversations are available and securityAIAssistant is enabled', () => {
    renderComponent({
      conversations: mockConversations,
    });
    expect(screen.getByTestId('AssistantSettingsManagement')).toBeInTheDocument();
  });
});
