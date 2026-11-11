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
import { useTopologySnapshot } from './use_topology_snapshot';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const fetch = jest.fn();
const snapshot = {
  built_at: '2026-11-03T12:00:00.000Z',
  source_ids: [],
  nodes: [],
  edges: [],
  node_count: 0,
  edge_count: 0,
  truncated: false,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  fetch.mockReset().mockResolvedValue(snapshot);
  jest.mocked(useKibana).mockReturnValue({
    services: {
      significantEvents: { significantEventsRepositoryClient: { fetch } },
    },
  } as never);
});

it('normalizes selected sources into one cached request', async () => {
  const { result } = renderHook(
    () => [
      useTopologySnapshot(['source-b', 'source-a']),
      useTopologySnapshot(['source-a', 'source-b']),
    ],
    { wrapper }
  );

  await waitFor(() => expect(result.current[0].isSuccess).toBe(true));
  expect(result.current[1].isSuccess).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('GET /internal/nightshift/topology', {
    signal: expect.any(AbortSignal),
    params: { query: { sourceIds: ['source-a', 'source-b'] } },
  });
});

it('omits source parameters to request all readable sources', async () => {
  const { result } = renderHook(() => useTopologySnapshot([]), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(fetch).toHaveBeenCalledWith('GET /internal/nightshift/topology', {
    signal: expect.any(AbortSignal),
  });
});
