/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { FleetCardsProvider, useFleetCards } from './fleet_cards_provider';

const mockUseAvailablePackages = jest.fn();

jest.mock('@kbn/fleet-plugin/public', () => {
  const { LocalSearchHook } = jest.requireActual('@kbn/fleet-plugin/public');
  return {
    LocalSearchHook,
    AvailablePackagesHook: () =>
      Promise.resolve({ useAvailablePackages: mockUseAvailablePackages }),
  };
});

const redisCard = {
  id: 'epr:redis',
  name: 'redis',
  title: 'Redis',
  description: 'Key-value store.',
  categories: ['observability'],
  icons: [],
  url: '/app/integrations/detail/redis',
  version: '1.0.0',
  integration: '',
};

const onMount = jest.fn();
const onRender = jest.fn();

const Consumer = () => {
  const { allCards } = useFleetCards();
  onRender();
  useEffect(() => {
    onMount();
  }, []);
  return <div data-test-subj="consumerCardCount">{allCards.length}</div>;
};

const renderProvider = () =>
  render(
    <FleetCardsProvider>
      <Consumer />
    </FleetCardsProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAvailablePackages.mockReturnValue({
    isLoading: false,
    eprPackageLoadingError: undefined,
    allCards: [redisCard],
  });
});

describe('FleetCardsProvider', () => {
  it('passes the loaded cards to its consumers', async () => {
    renderProvider();

    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  // Fleet's hooks arrive as an async chunk. Swapping the element that wraps the
  // children when it lands would throw away the whole grid and search results
  // below, along with anything the user had going in them.
  it('keeps its children mounted when the Fleet module arrives', async () => {
    renderProvider();

    await screen.findByText('1');
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  // Fleet's `useAvailablePackages` rebuilds `allCards` on every render, so
  // publishing it through state loops unless the publishing render is kept out
  // of the loop.
  it('settles instead of looping when Fleet rebuilds its cards each render', async () => {
    mockUseAvailablePackages.mockImplementation(() => ({
      isLoading: false,
      eprPackageLoadingError: undefined,
      allCards: [{ ...redisCard }],
    }));
    renderProvider();

    await screen.findByText('1');
    await waitFor(() => expect(mockUseAvailablePackages).toHaveBeenCalled());
    expect(onRender.mock.calls.length).toBeLessThan(10);
  });
});
