/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIntegrationCardList } from './use_integration_card_list';
import { mockReportLinkClick } from './__mocks__/mocks';
import type { GetInstalledPackagesResponse } from '@kbn/fleet-plugin/common/types';
import type { IntegrationTabId, Tab } from '../types';

jest.mock('./integration_context');

jest.mock('../../kibana', () => ({
  ...jest.requireActual('../../kibana'),
  useNavigation: jest.fn().mockReturnValue({
    navigateTo: jest.fn(),
    getAppUrl: jest.fn().mockReturnValue(''),
  }),
}));

const selectedTab: Tab = {
  id: 'test' as IntegrationTabId,
  label: 'Test Tab',
  category: 'test',
  sortByFeaturedIntegrations: false,
  featuredCardIds: [],
};

describe('useIntegrationCardList', () => {
  const mockIntegrationsList = [
    {
      id: 'epr:endpoint',
      name: 'endpoint',
      description: 'Integration for security monitoring',
      categories: ['security'],
      icons: [{ src: 'icon_url', type: 'image' }],
      integration: 'security',
      maxCardHeight: 127,
      onCardClick: expect.any(Function),
      showInstallStatus: true,
      titleLineClamp: 1,
      descriptionLineClamp: 3,
      showInstallationStatus: true,
      title: 'Security Integration',
      url: '/app/integrations/security?returnAppId=securitySolutionUI&returnPath=%2Fget_started',
      version: '1.0.0',
    },
    {
      id: 'epr:auditbeat',
      name: 'auditbeat',
      description: 'Integration for security monitoring',
      categories: ['security'],
      icons: [{ src: 'icon_url', type: 'image' }],
      integration: 'security',
      maxCardHeight: 127,
      onCardClick: expect.any(Function),
      showInstallStatus: true,
      titleLineClamp: 1,
      descriptionLineClamp: 3,
      showInstallationStatus: true,
      title: 'Security Integration',
      url: '/app/integrations/security?returnAppId=securitySolutionUI&returnPath=%2Fget_started',
      version: '1.0.0',
    },
  ];

  const mockActiveIntegrations: GetInstalledPackagesResponse['items'] = [
    {
      name: 'endpoint',
      version: '1.0.0',
      status: 'installed',
      dataStreams: [{ name: 'endpoint-data-stream', title: 'Endpoint Data Stream' }],
      title: 'Security Integration',
    },
  ];

  const mockFeaturedCards = [{ ...mockIntegrationsList[0], hasDataStreams: true }];
  const mockIntegrationCards = [
    {
      ...mockIntegrationsList[0],
      hasDataStreams: true,
    },
    {
      ...mockIntegrationsList[1],
      hasDataStreams: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns filtered integration cards when featuredCardIds are not provided', () => {
    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
        activeIntegrations: mockActiveIntegrations,
        selectedTab,
      })
    );

    expect(result.current).toEqual(mockIntegrationCards);
  });

  it('returns featured cards when featuredCardIds are provided', () => {
    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
        activeIntegrations: mockActiveIntegrations,
        selectedTab: { ...selectedTab, featuredCardIds: ['epr:endpoint'] },
      })
    );

    expect(result.current).toEqual(mockFeaturedCards);
  });

  it('tracks integration card click', () => {
    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
        activeIntegrations: mockActiveIntegrations,
        selectedTab,
      })
    );

    const card = result.current[0];
    card.onCardClick?.();

    expect(mockReportLinkClick).toHaveBeenCalledWith('card_epr:endpoint');
  });
});
