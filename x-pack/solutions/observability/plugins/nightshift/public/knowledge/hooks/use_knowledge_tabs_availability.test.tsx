/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { useKnowledgeTabsAvailability, useMemoryEnabled } from './use_knowledge_tabs_availability';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
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
