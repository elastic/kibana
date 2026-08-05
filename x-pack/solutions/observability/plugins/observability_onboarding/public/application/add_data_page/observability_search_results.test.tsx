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
    LazyPackageCard: ({ title }: { title: string }) =>
      ReactActual.createElement('div', { 'data-test-subj': 'mockPackageCard' }, title),
  };
});

const renderResults = (searchTerm = 'redis') =>
  render(
    <I18nProvider>
      <KibanaContextProvider services={coreMock.createStart()}>
        <MemoryRouter initialEntries={['/']}>
          <CompatRouter>
            <ObservabilitySearchResults searchTerm={searchTerm} />
          </CompatRouter>
        </MemoryRouter>
      </KibanaContextProvider>
    </I18nProvider>
  );

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
    expect(await screen.findByTestId('mockPackageCard')).toHaveTextContent('Redis');
    expect(screen.getByTestId('addDataSearchResultsCount')).toBeInTheDocument();
  });

  it('shows the error state when the Fleet module fails to load, and retries', async () => {
    const user = userEvent.setup();
    mockAvailablePackagesHook.mockRejectedValueOnce(new Error('chunk failed'));
    renderResults();
    const retryButton = await screen.findByTestId('addDataSearchResultsRetryButton');
    await user.click(retryButton);
    expect(await screen.findByTestId('mockPackageCard')).toBeInTheDocument();
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
    expect(await screen.findByTestId('mockPackageCard')).toBeInTheDocument();
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
});
