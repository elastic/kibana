/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of, throwError } from 'rxjs';
import { useAgentInventory } from './use_agent_inventory';
import type { AgentDefinitionResponse, AgentSearchResponse, AgentToolsResponse } from './types';

const mockGet = jest.fn();
const mockSearch = jest.fn();
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { http: { get: mockGet }, data: { search: { search: mockSearch } } },
  }),
}));

const definitions: AgentDefinitionResponse = {
  results: [
    {
      id: 'agent-a',
      name: 'Agent A',
      description: '',
      type: 'chat',
      readonly: false,
      configuration: { tools: [{ tool_ids: ['mcp-tool'] }] },
    },
  ],
};
const tools: AgentToolsResponse = {
  results: [
    {
      id: 'mcp-tool',
      type: 'mcp',
      configuration: { connector_id: 'connector-reference', tool_name: 'remote-tool' },
    },
  ],
};
const metrics: AgentSearchResponse = {
  _shards: { total: 1, failed: 0 },
  hits: { hits: [] },
  aggregations: {
    agents: { buckets: { 'agent-a': { doc_count: 7, failures: { doc_count: 0 } } } },
  },
};

const renderInventory = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAgentInventory('marketing'), { wrapper });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockImplementation((path: string) =>
    Promise.resolve(path.endsWith('/agents') ? definitions : tools)
  );
  mockSearch.mockReturnValue(of({ rawResponse: metrics }));
});

it('removes cached agent definitions after a failed refetch instead of showing stale private metadata', async () => {
  const { result } = renderInventory();
  await waitFor(() => expect(result.current.status).toBe('available'));
  expect(result.current.agents[0].configuredTools[0].connectorId).toBe('connector-reference');
  mockGet.mockImplementation((path: string) =>
    path.endsWith('/agents') ? Promise.reject(new Error('Forbidden')) : Promise.resolve(tools)
  );
  act(() => result.current.refetch());
  await waitFor(() => expect(result.current.definitionsStatus).toBe('unavailable'));
  expect(result.current.agents).toEqual([]);
});

it('removes cached connector details after tool access fails while keeping readable explicit tool IDs', async () => {
  const { result } = renderInventory();
  await waitFor(() => expect(result.current.status).toBe('available'));
  mockGet.mockImplementation((path: string) =>
    path.endsWith('/tools') ? Promise.reject(new Error('Forbidden')) : Promise.resolve(definitions)
  );
  act(() => result.current.refetch());
  await waitFor(() => expect(result.current.toolsStatus).toBe('unavailable'));
  expect(result.current.agents[0].configuredTools[0]).toEqual({
    id: 'mcp-tool',
    definitionAvailable: false,
  });
});

it('removes cached invocation totals after trace access fails instead of showing a stale total or zero', async () => {
  const { result } = renderInventory();
  await waitFor(() => expect(result.current.agents[0]?.activity?.invocations).toBe(7));
  mockSearch.mockReturnValue(throwError(() => new Error('Forbidden')));
  act(() => result.current.refetch());
  await waitFor(() => expect(result.current.activityStatus).toBe('unavailable'));
  expect(result.current.agents[0].activity).toBeUndefined();
});
