/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { IntegrationCardsProps } from './integrations_cards';
import { IntegrationCards } from './integrations_cards';
import { TestProviders } from '../../../../common/mock';

const mockNavigateTo = jest.fn();
jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useNavigation: () => ({
      navigateTo: mockNavigateTo,
    }),
  };
});

jest.mock('../../../../common/hooks/integrations/use_integration_link_state', () => ({
  useIntegrationLinkState: jest.fn(() => {}),
}));

const mockAddPathParamToUrl = jest.fn((...args: unknown[]) => 'URL_WITH_PARAMS');
jest.mock('../../../../common/utils/integrations', () => ({
  addPathParamToUrl: (...args: unknown[]) => mockAddPathParamToUrl(...args),
}));

const uninstalledOktaIntegration = {
  packageInfo: {
    name: 'entityanalytics_okta',
    title: 'Okta',
    version: '1.0.0',
    description: 'Okta integration for entity analytics',
    icons: [{ type: 'eui', src: 'logoOkta' }],
    status: 'not_installed',
  },
  hasDataStreams: false,
};

const installedAdIntegration = {
  packageInfo: {
    name: 'entityanalytics_ad',
    title: 'Active Directory',
    version: '2.0.0',
    description: 'Active Directory integration for entity analytics',
    icons: [{ type: 'eui', src: 'logoWindows' }],
    status: 'installed',
  },
  hasDataStreams: true,
};

const mockIntegrations = [uninstalledOktaIntegration, installedAdIntegration];

const mockUseEntityAnalyticsIntegrations = jest.fn(() => mockIntegrations);

jest.mock('../hooks/use_integrations', () => ({
  useEntityAnalyticsIntegrations: () => mockUseEntityAnalyticsIntegrations(),
}));

// Helper component to wrap IntegrationCards with Suspense
const IntegrationCardsWithSuspense = (props: IntegrationCardsProps) => (
  <Suspense fallback={<EuiLoadingSpinner data-test-subj="loading-integration-cards" />}>
    <IntegrationCards {...props} />
  </Suspense>
);

describe('IntegrationCards', () => {
  const mockOnIntegrationInstalled = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders integration cards for all available integrations', async () => {
    render(<IntegrationCardsWithSuspense onIntegrationInstalled={mockOnIntegrationInstalled} />, {
      wrapper: TestProviders,
    });

    await waitForIntegrationCardsToLoad();

    expect(screen.getByText('Okta')).toBeInTheDocument();

    expect(screen.getByText('Active Directory')).toBeInTheDocument();
    expect(screen.getByText('Okta integration for entity analytics')).toBeInTheDocument();
    expect(
      screen.getByText('Active Directory integration for entity analytics')
    ).toBeInTheDocument();

    // Check that the correct number of cards are rendered
    const cards = screen.getAllByTestId('entity_analytics-integration-card');
    expect(cards).toHaveLength(2);
  });

  it('calls onIntegrationInstalled when there are installed integrations', async () => {
    render(<IntegrationCardsWithSuspense onIntegrationInstalled={mockOnIntegrationInstalled} />, {
      wrapper: TestProviders,
    });

    await waitForIntegrationCardsToLoad();

    expect(mockOnIntegrationInstalled).toHaveBeenCalledWith(0);
  });

  it('does not call onIntegrationInstalled when no integrations are installed', async () => {
    const integrationsWithoutInstalled = [
      uninstalledOktaIntegration,
      {
        ...installedAdIntegration,
        packageInfo: {
          ...installedAdIntegration.packageInfo,
          status: 'not_installed',
        },
      },
    ];

    mockUseEntityAnalyticsIntegrations.mockReturnValue(integrationsWithoutInstalled);

    render(<IntegrationCardsWithSuspense onIntegrationInstalled={mockOnIntegrationInstalled} />, {
      wrapper: TestProviders,
    });

    await waitForIntegrationCardsToLoad();

    expect(screen.getByText('Okta')).toBeInTheDocument();

    expect(mockOnIntegrationInstalled).not.toHaveBeenCalled();
  });

  it('render the installation status when status is installed', async () => {
    const installedIntegration = {
      ...uninstalledOktaIntegration,
      packageInfo: {
        ...uninstalledOktaIntegration.packageInfo,
        status: 'installed',
      },
    };

    mockUseEntityAnalyticsIntegrations.mockReturnValue([installedIntegration]);
    render(
      <IntegrationCardsWithSuspense
        onIntegrationInstalled={mockOnIntegrationInstalled}
        showInstallationStatus={true}
      />,
      {
        wrapper: TestProviders,
      }
    );

    await waitForIntegrationCardsToLoad();

    expect(screen.getByText('Installed')).toBeInTheDocument();
  });
});

const waitForIntegrationCardsToLoad = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('loading-integration-cards')).not.toBeInTheDocument();
  });
};
