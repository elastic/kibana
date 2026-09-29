/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { ManagementSettings } from './management_settings';
import type { Conversation } from '@kbn/elastic-assistant';
import { useAssistantContext, useFetchCurrentUserConversations } from '@kbn/elastic-assistant';
import { useKibana } from '../../common/lib/kibana';
import { useConversation } from '@kbn/elastic-assistant/impl/assistant/use_conversation';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

// Mock the necessary hooks and components
vi.mock('@kbn/elastic-assistant', () => {
  const mocked = {
    useAssistantContext: vi.fn(),
    useFetchCurrentUserConversations: vi.fn(),
    Welcome: 'Welcome Conversation',
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/elastic-assistant/impl/assistant/settings/assistant_settings_management', () => {
  const mocked = {
    AssistantSettingsManagement: vi.fn(() => <div data-test-subj="AssistantSettingsManagement" />),
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/elastic-assistant/impl/assistant/use_conversation', () => {
  const mocked = {
    useConversation: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../common/hooks/use_space_id', () => {
  const mocked = {
    useSpaceId: vi.fn().mockReturnValue('default'),
  };
  return { ...mocked, default: mocked };
});

const useAssistantContextMock = useAssistantContext as Mock;
const useFetchCurrentUserConversationsMock = useFetchCurrentUserConversations as Mock;
const useKibanaMock = useKibana as Mock;
const useConversationMock = useConversation as Mock;

describe('ManagementSettings', () => {
  const queryClient = new QueryClient();
  const http = {};
  const getDefaultConversation = vi.fn();
  const setCurrentUserAvatar = vi.fn();
  const navigateToApp = vi.fn();
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
            change: vi.fn(),
          },
          setBreadcrumbs: vi.fn(),
        },
        data: {
          dataViews: {
            getIndices: vi.fn(),
          },
        },
        security: {
          userProfiles: {
            getCurrent: vi.fn().mockResolvedValue({ data: { color: 'blue', initials: 'P' } }),
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
    vi.clearAllMocks();
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
