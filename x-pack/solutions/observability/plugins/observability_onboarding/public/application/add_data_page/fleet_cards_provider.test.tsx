/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render, screen, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { ObservabilityOnboardingAppServices } from '../..';
import { FleetCardsProvider, useFleetCards } from './fleet_cards_provider';

const mockUseAvailablePackages = jest.fn();
const mockAvailablePackagesHook = jest.fn();
const mockUseGetSettingsQuery = jest.fn();

// Both hooks are stubbed rather than pulled from the real module: requiring it
// executes Fleet's whole public bundle, which costs more than Jest's timeout on a
// cold cache. Nothing here searches, so the search index hook is never called.
jest.mock('@kbn/fleet-plugin/public', () => ({
  LocalSearchHook: () => Promise.resolve({ useLocalSearch: jest.fn() }),
  AvailablePackagesHook: () => mockAvailablePackagesHook(),
  useGetSettingsQuery: (options: { enabled?: boolean }) => mockUseGetSettingsQuery(options),
}));

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

interface WrapOptions {
  path?: string;
  canReadSettings?: boolean;
}

const fleetService = (canReadSettings: boolean) =>
  ({ authz: { fleet: { readSettings: canReadSettings } } } as unknown as NonNullable<
    ObservabilityOnboardingAppServices['fleet']
  >);

const wrap = (ui: React.ReactNode, { path = '/', canReadSettings = true }: WrapOptions = {}) => (
  <KibanaContextProvider services={{ fleet: fleetService(canReadSettings) }}>
    <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
  </KibanaContextProvider>
);

const providerTree = (enabled: boolean) => (
  <FleetCardsProvider enabled={enabled}>
    <Consumer />
  </FleetCardsProvider>
);

const renderProvider = (enabled = true, options: WrapOptions = {}) =>
  render(wrap(providerTree(enabled), options));

const prereleaseFlagOf = (call: unknown[]) =>
  (call[0] as { prereleaseIntegrationsEnabled: boolean }).prereleaseIntegrationsEnabled;

beforeEach(() => {
  jest.clearAllMocks();
  mockAvailablePackagesHook.mockResolvedValue({ useAvailablePackages: mockUseAvailablePackages });
  mockUseAvailablePackages.mockReturnValue({
    isLoading: false,
    eprPackageLoadingError: undefined,
    allCards: [redisCard],
  });
  mockUseGetSettingsQuery.mockReturnValue({ data: undefined });
});

describe('FleetCardsProvider', () => {
  it('passes the loaded cards to its consumers', async () => {
    renderProvider();

    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  // A remount here throws away the grid and results below, along with anything
  // the user had going in them.
  it('keeps its children mounted when the Fleet module arrives', async () => {
    renderProvider();

    await screen.findByText('1');
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  // Fleet really does rebuild `allCards` every render, which loops unless the
  // publishing render is kept out of the cycle.
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

  // A page with no search and no grouping flag has nothing to show for the
  // packages, so it should not reach the registry at all.
  it('loads nothing while disabled, then loads once enabled', async () => {
    const { rerender } = render(wrap(providerTree(false)));

    expect(await screen.findByText('0')).toBeInTheDocument();
    expect(mockAvailablePackagesHook).not.toHaveBeenCalled();

    rerender(wrap(providerTree(true)));

    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(mockAvailablePackagesHook).toHaveBeenCalled();
  });
});

// Fleet dropped its beta toggle, so the catalog is GA only unless the url or the
// Fleet settings opt in. Asking for prerelease regardless would hand the grid
// packages the catalog itself will not show.
describe('FleetCardsProvider prerelease packages', () => {
  it('asks for GA packages only by default', async () => {
    renderProvider();

    await screen.findByText('1');
    expect(prereleaseFlagOf(mockUseAvailablePackages.mock.calls[0])).toBe(false);
  });

  it('asks for prerelease packages once the Fleet settings opt in', async () => {
    mockUseGetSettingsQuery.mockReturnValue({
      data: { item: { prerelease_integrations_enabled: true } },
    });
    renderProvider();

    await screen.findByText('1');
    expect(prereleaseFlagOf(mockUseAvailablePackages.mock.calls[0])).toBe(true);
  });

  it('asks for prerelease packages when the url opts in', async () => {
    renderProvider(true, { path: '/?prerelease=true' });

    await screen.findByText('1');
    expect(prereleaseFlagOf(mockUseAvailablePackages.mock.calls[0])).toBe(true);
  });

  it('leaves the settings query disabled without the read privilege', async () => {
    renderProvider(true, { canReadSettings: false });

    await screen.findByText('1');
    expect(mockUseGetSettingsQuery).toHaveBeenCalledWith({ enabled: false });
  });

  it('enables the settings query with the read privilege', async () => {
    renderProvider();

    await screen.findByText('1');
    expect(mockUseGetSettingsQuery).toHaveBeenCalledWith({ enabled: true });
  });
});
