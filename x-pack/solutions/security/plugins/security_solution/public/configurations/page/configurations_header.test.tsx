/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SECURITY_FEATURE_ID } from '../../../common/constants';
import { ADD_INTEGRATIONS_MENU_ITEM_TEST_ID } from '../../common/components/app_header/use_add_integrations_menu_item';
import { useKibana as readKibanaMock } from '../../common/lib/kibana/__mocks__';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import { ConfigurationTabs } from '../constants';
import { ConfigurationsHeader } from './configurations_header';

jest.mock('../../common/lib/kibana');
jest.mock('../../agent_builder/hooks/use_agent_builder_availability');
jest.mock('../../common/hooks/use_add_integrations_url', () => ({
  useAddIntegrationsUrl: () => ({
    href: '/app/security/configurations/integrations/browse',
    onClick: jest.fn(),
  }),
}));
jest.mock('../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));

const DOC_HREF = 'https://www.elastic.co/docs/solutions/security';
const mockNavigateTo = jest.fn();
const mockGetAppUrl = jest.fn(
  ({ deepLinkId }: { deepLinkId: string }) => `/app/security/${deepLinkId}`
);

const baseServices = readKibanaMock().services;

const mockCapabilities = (fleetRead: boolean) => {
  (useKibana as jest.Mock).mockReturnValue({
    services: {
      ...baseServices,
      docLinks: {
        ...baseServices.docLinks,
        links: {
          ...baseServices.docLinks.links,
          siem: {
            ...baseServices.docLinks.links.siem,
            guide: DOC_HREF,
          },
        },
      },
      application: {
        ...baseServices.application,
        capabilities: {
          ...baseServices.application.capabilities,
          fleet: { read: fleetRead },
          [SECURITY_FEATURE_ID]: {
            ...baseServices.application.capabilities[SECURITY_FEATURE_ID],
            configurations: true,
          },
        },
      },
    },
  });
};

const renderHeader = (tab: ConfigurationTabs = ConfigurationTabs.integrations) =>
  render(
    <MemoryRouter initialEntries={[`/configurations/${tab}`]}>
      <Route path="/configurations/:tab?">
        <TestProviders>
          <ConfigurationsHeader />
        </TestProviders>
      </Route>
    </MemoryRouter>
  );

describe('ConfigurationsHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilities(true);
    (useNavigation as jest.Mock).mockReturnValue({
      navigateTo: mockNavigateTo,
      getAppUrl: mockGetAppUrl,
    });
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
    });
  });

  it('renders the title and all tabs, with the route tab selected', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Configurations');
    expect(
      screen.getByTestId(`configurationsTab-${ConfigurationTabs.integrations}`)
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId(`configurationsTab-${ConfigurationTabs.basicRules}`)).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(
      screen.getByTestId(`configurationsTab-${ConfigurationTabs.aiSettings}`)
    ).toBeInTheDocument();
  });

  it('does not render the AI settings tab when the agent chat experience is enabled', () => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
    });

    renderHeader();

    expect(
      screen.getByTestId(`configurationsTab-${ConfigurationTabs.integrations}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`configurationsTab-${ConfigurationTabs.basicRules}`)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`configurationsTab-${ConfigurationTabs.aiSettings}`)
    ).not.toBeInTheDocument();
  });

  it('navigates with the tab deep link and exposes it as an href', async () => {
    renderHeader();

    const rulesTab = screen.getByTestId(`configurationsTab-${ConfigurationTabs.basicRules}`);
    expect(rulesTab).toHaveAttribute(
      'href',
      `/app/security/${SecurityPageName.configurationsBasicRules}`
    );

    await userEvent.click(rulesTab);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.configurationsBasicRules,
    });
  });

  it('shows Documentation and hides Add integrations in a Search AI Lake space', async () => {
    renderHeader();
    await openAppMenuOverflow();

    expect(screen.queryByTestId(ADD_INTEGRATIONS_MENU_ITEM_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      DOC_HREF
    );
  });
});
