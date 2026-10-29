/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useFetchEventById } from './use_fetch_event_by_id';

const mockSignificantEventsFetch = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      significantEvents: {
        significantEventsRepositoryClient: { fetch: mockSignificantEventsFetch },
      },
    },
  }),
}));

describe('useFetchEventById', () => {
  it('resolves to null (never undefined, which react-query rejects) when the event does not exist', async () => {
    mockSignificantEventsFetch.mockResolvedValue({ hits: [], page: 1, perPage: 1, total: 0 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useFetchEventById('evt-unknown'), { wrapper });

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
