/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  ALERTZERO_ENABLED_SETTING,
  ALERTZERO_ONBOARDING_ENABLE_URL,
  API_VERSIONS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  createCatalogWatchPlaceholder,
  type Watch,
} from '@kbn/alertzero-common';
import { useEnableOnboarding, useOnboardingState } from './use_onboarding_state';
import { usePendingProposals } from './use_proposals_api';
import { useWatches } from './use_watches_api';

jest.mock('./use_watches_api', () => ({ useWatches: jest.fn() }));
jest.mock('./use_proposals_api', () => ({ usePendingProposals: jest.fn() }));

const mockUseWatches = jest.mocked(useWatches);
const mockUsePendingProposals = jest.mocked(usePendingProposals);

type Services = ReturnType<typeof createServices>;

const createServices = (
  overrides: { enabled?: boolean; canSaveAdvancedSettings?: boolean } = {}
) => {
  const base = coreMock.createStart();
  return {
    ...base,
    uiSettings: {
      ...base.uiSettings,
      get: jest.fn().mockReturnValue(overrides.enabled ?? false),
      get$: jest.fn().mockReturnValue({
        subscribe: (onNext: (value: boolean) => void) => {
          onNext(overrides.enabled ?? false);
          return { unsubscribe: jest.fn() };
        },
      }),
      set: jest.fn(),
    },
    application: {
      ...base.application,
      capabilities: {
        ...base.application.capabilities,
        advancedSettings: { save: overrides.canSaveAdvancedSettings ?? true },
      },
    },
  };
};

interface OnboardingFixtures {
  services: Services;
  watches?: Watch[];
  proposalsCount?: number;
  watchesLoading?: boolean;
  proposalsLoading?: boolean;
  watchesError?: unknown;
}

const renderOnboarding = (fixtures: OnboardingFixtures) => {
  mockUseWatches.mockReturnValue({
    data: { watches: fixtures.watches ?? [] },
    isLoading: fixtures.watchesLoading ?? false,
    error: fixtures.watchesError ?? null,
    refetch: jest.fn(),
  } as never);
  mockUsePendingProposals.mockReturnValue({
    data: { proposals: Array.from({ length: fixtures.proposalsCount ?? 0 }) },
    isLoading: fixtures.proposalsLoading ?? false,
    refetch: jest.fn(),
  } as never);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <KibanaContextProvider services={fixtures.services as never}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
  return { queryClient, ...renderHook(() => useOnboardingState(), { wrapper }) };
};

const unrunWatch = (): Watch => ({
  ...createCatalogWatchPlaceholder(SYSTEM_SECURITY_WATCH_FLOOR_ID),
  metrics: { lastRun: null },
  recentRuns: [],
});

describe('useOnboardingState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives S0 (disabled) when the advanced setting is false, regardless of watches', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: false }),
      watches: [unrunWatch()],
    });
    expect(result.current.state).toBe('disabled');
    expect(result.current.enabled).toBe(false);
    expect(result.current.hasWatches).toBe(true);
  });

  it('derives S1 (no-watches) when enabled with no installed watches', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      watches: [],
    });
    expect(result.current.state).toBe('no-watches');
    expect(result.current.enabled).toBe(true);
    expect(result.current.hasWatches).toBe(false);
  });

  it('derives S2 (awaiting-first-run) when a watch is installed but never ran', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      watches: [unrunWatch()],
    });
    expect(result.current.state).toBe('awaiting-first-run');
    expect(result.current.hasRun).toBe(false);
  });

  it('derives active when a watch has run evidence', () => {
    const run = unrunWatch();
    // @ts-expect-error a single recent run shape is enough for the derivation
    run.recentRuns = [{}];
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      watches: [run],
    });
    expect(result.current.state).toBe('active');
    expect(result.current.hasRun).toBe(true);
  });

  it('derives active when proposals exist even without run evidence on the watch', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      watches: [unrunWatch()],
      proposalsCount: 1,
    });
    expect(result.current.state).toBe('active');
    expect(result.current.hasRun).toBe(true);
  });

  it('exposes canToggle from capabilities.advancedSettings.save', () => {
    const withPermission = renderOnboarding({
      services: createServices({ enabled: false, canSaveAdvancedSettings: true }),
    });
    expect(withPermission.result.current.canToggle).toBe(true);

    const withoutPermission = renderOnboarding({
      services: createServices({ enabled: false, canSaveAdvancedSettings: false }),
    });
    expect(withoutPermission.result.current.canToggle).toBe(false);
  });

  it('reports isLoading while watches or proposals are still loading', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      watchesLoading: true,
    });
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useEnableOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POSTs the enable route and flips the local advanced setting on success', async () => {
    const services = createServices({ enabled: false });
    const post = jest.fn().mockResolvedValue({});
    const http = { ...services.http, post };
    mockUseWatches.mockReturnValue({
      data: { watches: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as never);
    mockUsePendingProposals.mockReturnValue({
      data: { proposals: [] },
      isLoading: false,
      refetch: jest.fn(),
    } as never);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <KibanaContextProvider services={{ ...services, http } as never}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KibanaContextProvider>
    );
    const { result } = renderHook(() => useEnableOnboarding(), { wrapper });

    act(() => {
      result.current.mutate();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(post).toHaveBeenCalledWith(ALERTZERO_ONBOARDING_ENABLE_URL, {
      version: API_VERSIONS.internal.v1,
    });
    expect(services.uiSettings.set).toHaveBeenCalledWith(ALERTZERO_ENABLED_SETTING, true);
  });
});
