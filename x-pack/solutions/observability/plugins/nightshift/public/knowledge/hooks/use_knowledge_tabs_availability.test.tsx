/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useDeveloperMode } from '../../hooks/use_developer_mode';
import { useKibana } from '../../hooks/use_kibana';
import { useKnowledgeTabsAvailability, useMemoryEnabled } from './use_knowledge_tabs_availability';

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_developer_mode');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseDeveloperMode = useDeveloperMode as jest.MockedFunction<typeof useDeveloperMode>;
const givenDeveloperMode = (isDeveloperMode: boolean) =>
  mockUseDeveloperMode.mockReturnValue({
    isDeveloperMode,
    isSaving: false,
    setDeveloperMode: jest.fn(),
  });
const fetchMock = jest.fn();
const httpGetMock = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const givenClient = () => {
  mockUseKibana.mockReturnValue({
    services: {
      nightshiftInvestigations: { investigationsClient: { fetch: fetchMock } },
      http: { get: httpGetMock },
    },
  } as unknown as ReturnType<typeof useKibana>);
};

beforeEach(() => {
  jest.clearAllMocks();
  givenClient();
  givenDeveloperMode(true);
});

it('hides Decision Trees without requesting availability when developer mode is off', async () => {
  givenDeveloperMode(false);
  fetchMock.mockResolvedValue({ enabled: true });
  const { result } = renderHook(() => useKnowledgeTabsAvailability(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.memory.isEnabled).toBe(true));
  expect(result.current.decision_trees).toEqual({ isEnabled: false, isLoading: false });
  expect(httpGetMock).not.toHaveBeenCalled();
});

it('shows Decision Trees when developer mode is on and the feature is available', async () => {
  httpGetMock.mockResolvedValue({ enabled: true });
  fetchMock.mockResolvedValue({ enabled: false });
  const { result } = renderHook(() => useKnowledgeTabsAvailability(), {
    wrapper: createWrapper(),
  });

  await waitFor(() =>
    expect(result.current.decision_trees).toEqual({ isEnabled: true, isLoading: false })
  );
  expect(httpGetMock).toHaveBeenCalledWith(
    '/internal/nightshift/decision_trees/availability',
    expect.anything()
  );
});

it('hides Decision Trees when developer mode is turned off after availability was cached', async () => {
  httpGetMock.mockResolvedValue({ enabled: true });
  fetchMock.mockResolvedValue({ enabled: false });
  const { result, rerender } = renderHook(() => useKnowledgeTabsAvailability(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.decision_trees.isEnabled).toBe(true));

  givenDeveloperMode(false);
  rerender();

  expect(result.current.decision_trees).toEqual({ isEnabled: false, isLoading: false });
});

it('reports a disabled Memory feature after the availability request settles', async () => {
  fetchMock.mockResolvedValue({ enabled: false });
  const { result } = renderHook(() => useMemoryEnabled(), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current).toEqual({ isEnabled: false, isLoading: false }));
});

it('does not request Memory availability when the investigations client is absent', async () => {
  mockUseKibana.mockReturnValue({
    services: {},
  } as unknown as ReturnType<typeof useKibana>);
  const { result } = renderHook(() => useMemoryEnabled(), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current).toEqual({ isEnabled: false, isLoading: false }));
  expect(fetchMock).not.toHaveBeenCalled();
});

it('does not request any tab availability when globally disabled', () => {
  const { result } = renderHook(() => useKnowledgeTabsAvailability({ enabled: false }), {
    wrapper: createWrapper(),
  });

  expect(result.current).toEqual({
    knowledge_indicators: { isEnabled: true, isLoading: false },
    cortex: { isEnabled: false, isLoading: false },
    memory: { isEnabled: false, isLoading: false },
    decision_trees: { isEnabled: false, isLoading: false },
  });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(httpGetMock).not.toHaveBeenCalled();
});

it('distinguishes a pending Memory request from a disabled feature', async () => {
  let resolveFetch: (value: { enabled: boolean }) => void = () => {};
  fetchMock.mockReturnValue(
    new Promise<{ enabled: boolean }>((resolve) => {
      resolveFetch = resolve;
    })
  );
  const { result } = renderHook(() => useMemoryEnabled(), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.isLoading).toBe(true));
  expect(result.current.isEnabled).toBe(false);

  resolveFetch({ enabled: true });
  await waitFor(() => expect(result.current).toEqual({ isEnabled: true, isLoading: false }));
});
