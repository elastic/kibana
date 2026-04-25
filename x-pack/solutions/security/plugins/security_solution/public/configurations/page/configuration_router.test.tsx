/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { ConfigurationsRouter } from './configuration_router';
import { TestProviders } from '../../common/mock';
import { CONFIGURATIONS_PATH } from '../../../common/constants';
import { ConfigurationTabs } from '../constants';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { SecurityPageName } from '@kbn/security-solution-navigation';

jest.mock('../../agent_builder/hooks/use_agent_builder_availability');
jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useNavigation: jest.fn(),
}));
jest.mock('../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

const mockNavigateTo = jest.fn();

describe('ConfigurationsRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
    });
    (useNavigation as jest.Mock).mockReturnValue({
      navigateTo: mockNavigateTo,
    });
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
  });

  it('renders AISettings component when isAgentChatExperienceEnabled is false', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={[`${CONFIGURATIONS_PATH}/${ConfigurationTabs.aiSettings}`]}>
        <TestProviders>
          <ConfigurationsRouter />
        </TestProviders>
      </MemoryRouter>
    );

    // The AISettingsRouteGuard will render AISettings when Agent experience is disabled
    // We can verify this by checking that the route guard component exists
    expect(getByTestId('SearchAILakeConfigurationsSettingsManagement')).toBeInTheDocument();
  });

  it('redirects when isAgentChatExperienceEnabled is true', () => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
    });

    render(
      <MemoryRouter initialEntries={[`${CONFIGURATIONS_PATH}/${ConfigurationTabs.aiSettings}`]}>
        <TestProviders>
          <ConfigurationsRouter />
        </TestProviders>
      </MemoryRouter>
    );

    // The route guard should redirect to integrations
    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.configurationsIntegrations,
    });
  });
});
