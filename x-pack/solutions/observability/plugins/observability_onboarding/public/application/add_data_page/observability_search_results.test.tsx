/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { ObservabilitySearchResults } from './observability_search_results';

const mockUseAvailablePackages = jest.fn();
const mockAvailablePackagesHook = jest.fn();

jest.mock('@kbn/fleet-plugin/public', () => {
  const ReactActual = jest.requireActual('react');
  const { LocalSearchHook } = jest.requireActual('@kbn/fleet-plugin/public');
  return {
    LocalSearchHook,
    AvailablePackagesHook: () => mockAvailablePackagesHook(),
    CardIcon: () => ReactActual.createElement('span', { 'data-test-subj': 'resultCardIconStub' }),
  };
});

const renderResults = (searchTerm = 'redis', onOpenCollection = jest.fn()) => {
  render(
    <I18nProvider>
      <KibanaContextProvider services={coreMock.createStart()}>
        <MemoryRouter initialEntries={['/']}>
          <CompatRouter>
            <ObservabilitySearchResults
              searchTerm={searchTerm}
              onOpenCollection={onOpenCollection}
            />
          </CompatRouter>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return onOpenCollection;
};

const packagesResult = {
  isLoading: false,
  eprPackageLoadingError: undefined,
  allCards: [
    {
      id: 'epr:redis',
      name: 'redis',
      title: 'Redis',
      description: 'Key-value store.',
      categories: ['observability'],
      icons: [],
      url: '/app/integrations/detail/redis',
      version: '1.0.0',
      integration: '',
      type: 'integration',
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAvailablePackagesHook.mockResolvedValue({
    useAvailablePackages: mockUseAvailablePackages,
  });
  mockUseAvailablePackages.mockReturnValue(packagesResult);
});

describe('ObservabilitySearchResults', () => {
  it('shows the loading state, then the results', async () => {
    renderResults();
    expect(screen.getByTestId('addDataSearchResultsLoading')).toBeInTheDocument();
    expect(await screen.findByTestId('addDataResultCard-epr:redis')).toHaveTextContent('Redis');
    expect(screen.getByTestId('addDataSearchResultsCount')).toBeInTheDocument();
  });

  it('surfaces a collection card whose click opens the page-hosted chooser', async () => {
    const user = userEvent.setup();
    mockUseAvailablePackages.mockReturnValue({
      ...packagesResult,
      allCards: [
        {
          id: 'collection:nginx',
          name: 'nginx',
          title: 'Nginx',
          description: 'Choose from ECS-based or OTel-based collection.',
          categories: ['observability'],
          icons: [],
          url: '/app/integrations/collection/nginx',
          version: '',
          integration: '',
          isCollectionCard: true,
          groupMembers: [
            { ...packagesResult.allCards[0], id: 'epr:nginx', name: 'nginx', title: 'Nginx' },
            { ...packagesResult.allCards[0], id: 'epr:nginx_otel', name: 'nginx_otel' },
          ],
        },
      ],
    });

    const onOpenCollection = renderResults('nginx');
    const card = await screen.findByTestId('addDataResultCard-collection:nginx');
    expect(card).toHaveTextContent('2 variants');

    await user.click(screen.getByText('Nginx'));
    expect(onOpenCollection).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'collection:nginx' })
    );
  });

  it('shows the error state when the Fleet module fails to load, and retries', async () => {
    const user = userEvent.setup();
    mockAvailablePackagesHook.mockRejectedValueOnce(new Error('chunk failed'));
    renderResults();
    const retryButton = await screen.findByTestId('addDataSearchResultsRetryButton');
    await user.click(retryButton);
    expect(await screen.findByTestId('addDataResultCard-epr:redis')).toBeInTheDocument();
  });

  it('shows loading rather than the stale error while a retry is in flight', async () => {
    const user = userEvent.setup();
    let resolveRetry: (hook: { useAvailablePackages: jest.Mock }) => void = () => {};
    mockAvailablePackagesHook
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          })
      );

    renderResults();
    await user.click(await screen.findByTestId('addDataSearchResultsRetryButton'));

    expect(screen.getByTestId('addDataSearchResultsLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('addDataSearchResultsError')).not.toBeInTheDocument();

    await act(async () => {
      resolveRetry({ useAvailablePackages: mockUseAvailablePackages });
    });
    expect(await screen.findByTestId('addDataResultCard-epr:redis')).toBeInTheDocument();
  });

  it('shows the error state when the package registry fails', async () => {
    mockUseAvailablePackages.mockReturnValue({
      ...packagesResult,
      allCards: [],
      eprPackageLoadingError: new Error('registry down'),
    });
    renderResults();
    expect(await screen.findByTestId('addDataSearchResultsError')).toBeInTheDocument();
  });

  it('remounts the package query when Retry follows a registry failure', async () => {
    const user = userEvent.setup();
    const perMount = [
      { ...packagesResult, allCards: [], eprPackageLoadingError: new Error('registry down') },
      packagesResult,
    ];
    // Fleet's hook is react-query backed, so a re-render replays the cached
    // error and only a fresh mount re-queries. `useState` models that: without
    // it this would pass even if Retry never unmounted the results.
    const useCachedPackagesResult = () => React.useState(() => perMount.shift())[0];
    mockUseAvailablePackages.mockImplementation(useCachedPackagesResult);

    renderResults();
    await user.click(await screen.findByTestId('addDataSearchResultsRetryButton'));
    expect(await screen.findByTestId('addDataResultCard-epr:redis')).toHaveTextContent('Redis');
  });
});
