/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useIntegrationCardList } from './use_integration_card_list';
import { mockReportLinkClick } from './__mocks__/mocks';
import type { GetInstalledPackagesResponse } from '@kbn/fleet-plugin/common/types';
import type { IntegrationTabId, Tab } from '../types';

vi.mock('./integration_context');

vi.mock('../../kibana', async () => {
      const mocked = {
      ...(await vi.importActual('../../kibana')),
      useNavigation: vi.fn().mockReturnValue({
        navigateTo: vi.fn(),
        getAppUrl: vi.fn().mockReturnValue(''),
      }),
    };
      return { ...mocked, default: mocked };
    });

const selectedTab: Tab = {
  id: 'test' as IntegrationTabId,
  label: 'Test Tab',
  category: 'test',
  sortByFeaturedIntegrations: false,
  featuredCardIds: [],
};

describe('useIntegrationCardList', () => {
  const mockOnCardClick = vi.fn();
  const mockIntegrationsList = [
    {
      id: 'epr:endpoint',
      name: 'endpoint',
      description: 'Integration for security monitoring',
      categories: ['security'],
      icons: [{ src: 'icon_url', type: 'image' }],
      integration: 'security',
      maxCardHeight: 127,
      onCardClick: mockOnCardClick,
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
      onCardClick: mockOnCardClick,
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns filtered integration cards when featuredCardIds are not provided', () => {
    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
        activeIntegrations: mockActiveIntegrations,
        selectedTab,
      })
    );

    expect(result.current).toEqual([
      expect.objectContaining({ id: 'epr:endpoint', hasDataStreams: true }),
      expect.objectContaining({ id: 'epr:auditbeat', hasDataStreams: false }),
    ]);
    expect(result.current[0].onCardClick).toBeInstanceOf(Function);
    expect(result.current[1].onCardClick).toBeInstanceOf(Function);
  });

  it('returns featured cards when featuredCardIds are provided', () => {
    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
        activeIntegrations: mockActiveIntegrations,
        selectedTab: { ...selectedTab, featuredCardIds: ['epr:endpoint'] },
      })
    );

    expect(result.current).toEqual([
      expect.objectContaining({ id: 'epr:endpoint', hasDataStreams: true }),
    ]);
    expect(result.current[0].onCardClick).toBeInstanceOf(Function);
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
