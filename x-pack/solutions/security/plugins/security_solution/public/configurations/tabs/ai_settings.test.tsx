/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { AISettings } from './ai_settings';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import { CONVERSATIONS_TAB } from '@kbn/elastic-assistant';
import { SecurityPageName } from '@kbn/deeplinks-security';

const mockNavigateTo = jest.fn();
jest.mock('../../common/lib/kibana');
jest.mock('../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

describe('AISettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
          capabilities: {
            securitySolutionAssistant: { 'ai-assistant': true },
          },
        },
        data: { dataViews: {} },
      },
    });
    (useNavigation as jest.Mock).mockReturnValue({
      navigateTo: mockNavigateTo,
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
    const mockNavigateToApp = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
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
});
