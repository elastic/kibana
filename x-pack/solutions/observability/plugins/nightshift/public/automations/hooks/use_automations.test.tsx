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
import { useAutomationsRunsInRange } from './use_automations';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const investigationsFetch = jest.fn();

const renderWithClient = <T,>(hook: () => T) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
};

describe('use_automations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        nightshiftInvestigations: { investigationsClient: { fetch: investigationsFetch } },
      },
    });
  });

  it('loads runs for every automation in the range', async () => {
    investigationsFetch.mockImplementation((_endpoint, { params }) =>
      Promise.resolve({ runs: [], total: params.path.id === 'a' ? 3 : 1 })
    );
    const { result } = renderWithClient(() =>
      useAutomationsRunsInRange(['a', 'b'], '2026-10-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z')
    );

    await waitFor(() => expect(result.current.map(({ data }) => data?.total)).toEqual([3, 1]));
    expect(investigationsFetch).toHaveBeenCalledWith(
      'GET /internal/nightshift/automations/{id}/runs',
      {
        params: {
          path: { id: 'a' },
          query: {
            page: 1,
            size: 100,
            startedAfter: '2026-10-01T00:00:00.000Z',
            startedBefore: '2026-10-02T00:00:00.000Z',
          },
        },
        signal: null,
      }
    );
  });
});
