/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../use_kibana';
import { renderHook, waitFor } from '@testing-library/react';
import { useAgentCount } from './use_agent_count';

jest.mock('../use_kibana');
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockToolsService = {
  list: jest.fn().mockReturnValue(Promise.resolve([])),
};
const mockAgentsService = {
  list: jest.fn().mockReturnValue(Promise.resolve([])),
};
const mockAgentBuilderService = {
  tools: mockToolsService,
  agents: mockAgentsService,
};

const queryClient = new QueryClient();
const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useAgentCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    // look for better typecasting
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: mockAgentBuilderService,
      } as any,
    } as any);
  });

  it('should fetch the agent count', async () => {
    mockAgentsService.list.mockReturnValue(
      Promise.resolve([
        {
          agent: 'fake-agent',
        },
        {
          agent: 'fake-agent2',
        },
      ])
    );
    const { result } = renderHook(() => useAgentCount(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());
    await waitFor(() => expect(result.current.isError).toBeFalsy());
    await waitFor(() => expect(result.current.agents).toBe(2));
  });

  it('should fetch the tools count', async () => {
    mockToolsService.list.mockReturnValue(
      Promise.resolve([{ tool: 'fake-tool' }, { tool: 'fake-tool2' }])
    );
    const { result } = renderHook(() => useAgentCount(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());
    await waitFor(() => expect(result.current.isError).toBeFalsy());
    await waitFor(() => expect(result.current.tools).toBe(2));
  });
});
