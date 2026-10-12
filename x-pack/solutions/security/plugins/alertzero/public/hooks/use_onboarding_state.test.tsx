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
  type Worker,
} from '@kbn/alertzero-common';
import { useEnableOnboarding, useOnboardingState } from './use_onboarding_state';
import { useProposalsList } from './use_proposals_api';
import { useWorkers } from './use_workers_api';

jest.mock('./use_watches_api', () => ({
  useWatches: jest.fn(),
  retryOnceOnTransientError: jest.fn(() => false),
}));
jest.mock('./use_workers_api', () => ({ useWorkers: jest.fn() }));
jest.mock('./use_proposals_api', () => ({
  useProposalsList: jest.fn(),
  DEFAULT_PROPOSALS_WINDOW_HOURS: 24,
}));

const mockUseWorkers = jest.mocked(useWorkers);
const mockUseProposalsList = jest.mocked(useProposalsList);

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

/**
 * Minimal Worker fixture. The derivation reads exactly two fields: `settingsRevision`
 * (null until the per-space managed Worker has been installed — the API's install marker)
 * and `lastRun` (the real invocation timestamp).
 */
const worker = (
  overrides: { settingsRevision?: number | null; lastRun?: string | null } = {}
): Worker =>
  ({
    id: 'worker-1',
    settingsRevision: null,
    lastRun: null,
    ...overrides,
  } as unknown as Worker);

interface OnboardingFixtures {
  services: Services;
  workers?: Worker[];
  proposalsCount?: number;
  workersLoading?: boolean;
  workersFetching?: boolean;
  proposalsLoading?: boolean;
  workersError?: unknown;
  proposalsError?: unknown;
}

const renderOnboarding = (fixtures: OnboardingFixtures) => {
  mockUseWorkers.mockReturnValue({
    data: { workers: fixtures.workers ?? [] },
    isLoading: fixtures.workersLoading ?? false,
    isFetching: fixtures.workersFetching ?? false,
    error: fixtures.workersError ?? null,
    refetch: jest.fn(),
  } as never);
  mockUseProposalsList.mockReturnValue({
    data: { groups: {}, total: fixtures.proposalsCount ?? 0, truncated: false },
    isLoading: fixtures.proposalsLoading ?? false,
    error: fixtures.proposalsError ?? null,
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

describe('useOnboardingState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives S0 (disabled) when the advanced setting is false, regardless of workers', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: false }),
      workers: [worker({ settingsRevision: 3, lastRun: '2026-10-12T10:00:00.000Z' })],
    });
    expect(result.current.state).toBe('disabled');
    expect(result.current.enabled).toBe(false);
    expect(result.current.hasWatches).toBe(true);
  });

  it('derives S1 (no-watches) when enabled and no worker is installed in the space', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      // The catalog lists every registered worker for every space — settingsRevision null
      // is what says this space has installed none of them.
      workers: [worker(), worker({ settingsRevision: null })],
    });
    expect(result.current.state).toBe('no-watches');
    expect(result.current.enabled).toBe(true);
    expect(result.current.hasWatches).toBe(false);
  });

  it('derives S2 (awaiting-first-run) when a worker is installed but has never run', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      workers: [worker({ settingsRevision: 1 })],
    });
    expect(result.current.state).toBe('awaiting-first-run');
    expect(result.current.hasWatches).toBe(true);
    expect(result.current.hasRun).toBe(false);
  });

  it('derives active from a real worker run even when it produced no proposal', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      // lastRun comes from the live workflow executions, so a run that yielded no
      // proposal still completes onboarding.
      workers: [worker({ settingsRevision: 1, lastRun: '2026-10-12T10:00:00.000Z' })],
    });
    expect(result.current.state).toBe('active');
    expect(result.current.hasRun).toBe(true);
  });

  it('derives active when proposals exist even without run evidence on the worker', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      workers: [worker({ settingsRevision: 1 })],
      proposalsCount: 1,
    });
    expect(result.current.state).toBe('active');
    expect(result.current.hasRun).toBe(true);
  });

  it('flags a failed live read so an empty-looking space is not taken as an empty installation', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      workers: [],
      workersError: new Error('500 from /workers'),
    });
    expect(result.current.hasQueryError).toBe(true);
    // The state alone cannot distinguish failure from emptiness — consumers must consult
    // hasQueryError before acting on S1.
    expect(result.current.state).toBe('no-watches');

    const healthy = renderOnboarding({
      services: createServices({ enabled: true }),
      workers: [worker({ settingsRevision: 1 })],
    });
    expect(healthy.result.current.hasQueryError).toBe(false);
  });

  it('flags a failed proposals read too', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      workers: [worker({ settingsRevision: 1 })],
      proposalsError: new Error('500 from /proposals'),
    });
    expect(result.current.hasQueryError).toBe(true);
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

  it('reports isLoading while the workers or proposals reads are still in flight', () => {
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      workersLoading: true,
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('stays loading through an in-flight refetch that could still find an installation', () => {
    // After enable, the workers read is refreshed: while it is in flight the space still
    // looks empty, and "empty so far" must not be presented as an empty installation.
    const { result } = renderOnboarding({
      services: createServices({ enabled: true }),
      workers: [],
      workersFetching: true,
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
    mockUseWorkers.mockReturnValue({
      data: { workers: [] },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    } as never);
    mockUseProposalsList.mockReturnValue({
      data: { groups: {}, total: 0, truncated: false },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as never);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
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
      // http client requires a pre-stringified body; raw objects are coerced
      // to "[object Object]" and rejected by the route's strict zod validation
      body: JSON.stringify({}),
    });
    expect(services.uiSettings.set).toHaveBeenCalledWith(ALERTZERO_ENABLED_SETTING, true);
    // The gate derives its state from the live worker install, so enable must refresh it —
    // otherwise the space still looks empty and the freshly enabled app stays gated.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['alertzero', 'workers'] });
    // enable confirmation is transient feedback (a toast), not a full-page prompt
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'AlertZero is enabled',
      text: 'AlertZero will start running your watches and surface proposals after the next run.',
    });
  });
});
