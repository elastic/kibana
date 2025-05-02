/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIntegrationCardList } from './use_integration_card_list';
import { mockReportLinkClick } from './__mocks__/mocks';

jest.mock('./integration_context');

jest.mock('../../kibana', () => ({
  ...jest.requireActual('../../kibana'),
  useNavigation: jest.fn().mockReturnValue({
    navigateTo: jest.fn(),
    getAppUrl: jest.fn().mockReturnValue(''),
  }),
}));

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
      url: '/app/integrations/security',
      version: '1.0.0',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns filtered integration cards when featuredCardIds are not provided', () => {
    const mockFilteredCards = {
      featuredCards: {},
      integrationCards: mockIntegrationsList,
    };

    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
      })
    );

    expect(result.current).toEqual(mockFilteredCards.integrationCards);
  });

  it('returns featured cards when featuredCardIds are provided', () => {
    const featuredCardIds = ['epr:endpoint'];
    const mockFilteredCards = {
      featuredCards: {
        endpoint: mockIntegrationsList[0],
      },
      integrationCards: mockIntegrationsList,
    };

    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
        featuredCardIds,
      })
    );

    expect(result.current).toEqual([mockFilteredCards.featuredCards.endpoint]);
  });

  it('does not show installation status if no installed integrations are provided', () => {
    const featuredCardIds = ['epr:endpoint'];
    const mockFilteredCards = {
      featuredCards: {
        endpoint: mockIntegrationsList[0],
      },
      integrationCards: mockIntegrationsList,
    };

    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
        featuredCardIds,
      })
    );

    expect(result.current).toEqual([
      { ...mockFilteredCards.featuredCards.endpoint, showInstallationStatus: false },
    ]);
  });

  it('tracks integration card click', () => {
    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
      })
    );

    const card = result.current[0];
    card.onCardClick?.();

    expect(mockReportLinkClick).toHaveBeenCalledWith('card_epr:endpoint');
  });
});
