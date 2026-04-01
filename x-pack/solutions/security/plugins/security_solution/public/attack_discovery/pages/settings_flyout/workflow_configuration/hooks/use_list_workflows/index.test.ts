/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@kbn/react-query/mock';
import * as ReactQuery from '@kbn/react-query';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import React from 'react';

import { useKibana } from '../../../../../../common/lib/kibana';
import { useListWorkflows } from '.';

jest.mock('../../../../../../common/lib/kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useListWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient();
  });

  it('returns workflow data including the enabled field', async () => {
    const workflows = [
      {
        description: 'Alert retrieval workflow description',
        enabled: true,
        id: 'workflow-1',
        name: 'Alert Retrieval Workflow 1',
      },
      {
        description: 'A disabled workflow',
        enabled: false,
        id: 'workflow-2',
        name: 'Disabled Workflow',
      },
    ];

    const mockHttp = {
      get: jest.fn().mockResolvedValue({ results: workflows, total: workflows.length }),
    } as unknown as HttpSetup;

    mockUseKibana.mockReturnValue({ services: { http: mockHttp } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { result } = renderHook(() => useListWorkflows(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(workflows);
    });
  });

  it('calls the workflows list API', async () => {
    const mockHttp = {
      get: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    } as unknown as HttpSetup;

    mockUseKibana.mockReturnValue({ services: { http: mockHttp } } as unknown as ReturnType<
      typeof useKibana
    >);

    renderHook(() => useListWorkflows(), { wrapper });

    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith('/api/workflows', {
        query: {
          page: 1,
          size: 10000,
        },
        version: '2023-10-31',
      });
    });
  });

  it('enables refetchOnWindowFocus', () => {
    const useQuerySpy = jest.spyOn(ReactQuery, 'useQuery');

    const mockHttp = {
      get: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    } as unknown as HttpSetup;

    mockUseKibana.mockReturnValue({ services: { http: mockHttp } } as unknown as ReturnType<
      typeof useKibana
    >);

    renderHook(() => useListWorkflows(), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ refetchOnWindowFocus: true })
    );
  });
});
