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
