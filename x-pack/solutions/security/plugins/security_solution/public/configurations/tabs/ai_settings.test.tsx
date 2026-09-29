/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { AISettings } from './ai_settings';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import { CONVERSATIONS_TAB } from '@kbn/elastic-assistant';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';

const mockNavigateTo = vi.fn();
vi.mock('../../common/lib/kibana');
vi.mock('../../common/hooks/use_space_id', () => {
      const mocked = {
      useSpaceId: vi.fn().mockReturnValue('default'),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../agent_builder/hooks/use_agent_builder_availability', () => {
      const mocked = {
      useAgentBuilderAvailability: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('AISettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useKibana as Mock).mockReturnValue({
      services: {
        application: {
          navigateToApp: vi.fn(),
          capabilities: {
            securitySolutionAssistant: { 'ai-assistant': true },
          },
        },
        data: { dataViews: {} },
      },
    });
    (useNavigation as Mock).mockReturnValue({
      navigateTo: mockNavigateTo,
    });
    (useAgentBuilderAvailability as Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
    });
  });

  it('renders the SearchAILakeConfigurationsSettingsManagement component wiht default Conversations tab when securityAIAssistantEnabled is true', () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <TestProviders>
          <AISettings />
        </TestProviders>
      </MemoryRouter>
    );

    expect(getByTestId('SearchAILakeConfigurationsSettingsManagement')).toBeInTheDocument();
    expect(getByTestId(`tab-${CONVERSATIONS_TAB}`)).toBeInTheDocument();
  });
  it('onTabChange calls navigateTo with proper tab', () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <TestProviders>
          <AISettings />
        </TestProviders>
      </MemoryRouter>
    );

    fireEvent.click(getByTestId(`settingsPageTab-connectors`));
    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.configurationsAiSettings,
      path: `?tab=connectors`,
    });
  });
  it('navigates to the home app when securityAIAssistantEnabled is false', () => {
    const mockNavigateToApp = vi.fn();
    (useKibana as Mock).mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          capabilities: {
            securitySolutionAssistant: { 'ai-assistant': false },
          },
        },
        data: { dataViews: {} },
      },
    });

    render(
      <MemoryRouter>
        <TestProviders>
          <AISettings />
        </TestProviders>
      </MemoryRouter>
    );

    expect(mockNavigateToApp).toHaveBeenCalledWith('home');
  });

  it('navigates to integrations when isAgentChatExperienceEnabled is true', () => {
    (useAgentBuilderAvailability as Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
    });

    render(
      <MemoryRouter>
        <TestProviders>
          <AISettings />
        </TestProviders>
      </MemoryRouter>
    );

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.configurationsIntegrations,
    });
  });
});
