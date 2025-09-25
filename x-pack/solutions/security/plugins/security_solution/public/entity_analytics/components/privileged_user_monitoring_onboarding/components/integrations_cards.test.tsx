/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntegrationCards } from './integrations_cards';
import { TestProviders } from '../../../../common/mock';

jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackageCard: jest.fn(({ title, description, onCardClick, ...props }) => (
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )),
}));

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

const mockIntegrations = [
  {
    name: 'entityanalytics_okta',
    title: 'Okta',
    version: '1.0.0',
    description: 'Okta integration for entity analytics',
    icons: [{ type: 'eui', src: 'logoOkta' }],
    status: 'not_installed',
  },
  {
    name: 'entityanalytics_ad',
    title: 'Active Directory',
    version: '2.0.0',
    description: 'Active Directory integration for entity analytics',
    icons: [{ type: 'eui', src: 'logoWindows' }],
    status: 'installed',
  },
];

const mockUseEntityAnalyticsIntegrations = jest.fn(() => mockIntegrations);

jest.mock('../hooks/use_integrations', () => ({
  useEntityAnalyticsIntegrations: () => mockUseEntityAnalyticsIntegrations(),
}));

describe('IntegrationCards', () => {
  const mockOnIntegrationInstalled = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders integration cards for all available integrations', () => {
    render(<IntegrationCards onIntegrationInstalled={mockOnIntegrationInstalled} />, {
      wrapper: TestProviders,
    });

    // Check that both integration cards are rendered
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

  it('calls onIntegrationInstalled when there are installed integrations', () => {
    render(<IntegrationCards onIntegrationInstalled={mockOnIntegrationInstalled} />, {
      wrapper: TestProviders,
    });

    // The effect should be called because one integration has status 'installed'
    expect(mockOnIntegrationInstalled).toHaveBeenCalledWith(0);
  });

  it('does not call onIntegrationInstalled when no integrations are installed', () => {
    const integrationsWithoutInstalled = [
      {
        name: 'entityanalytics_okta',
        title: 'Okta',
        version: '1.0.0',
        description: 'Okta integration for entity analytics',
        icons: [{ type: 'eui', src: 'logoOkta' }],
        status: 'not_installed',
      },
      {
        name: 'entityanalytics_ad',
        title: 'Active Directory',
        version: '2.0.0',
        description: 'Active Directory integration for entity analytics',
        icons: [{ type: 'eui', src: 'logoWindows' }],
        status: 'not_installed',
      },
    ];

    mockUseEntityAnalyticsIntegrations.mockReturnValueOnce(integrationsWithoutInstalled);

    render(<IntegrationCards onIntegrationInstalled={mockOnIntegrationInstalled} />, {
      wrapper: TestProviders,
    });

    expect(mockOnIntegrationInstalled).not.toHaveBeenCalled();
  });
});
