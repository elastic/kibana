/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
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

let capturedQueryFn: ((args: { signal?: AbortSignal }) => Promise<unknown>) | undefined;

jest.mock('@kbn/react-query', () => ({
  useQuery: (params: {
    queryKey: readonly unknown[];
    enabled: boolean;
    queryFn: (args: { signal?: AbortSignal }) => Promise<unknown>;
  }) => {
    capturedQueryFn = params.queryFn;
    return { data: undefined, isFetched: false };
  },
}));

describe('useFetchEventById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryFn = undefined;
    mockSignificantEventsFetch.mockResolvedValue({ hits: [], page: 1, perPage: 1, total: 0 });
  });

  it('resolves to null (never undefined, which react-query rejects) when the event does not exist', async () => {
    renderHook(() => useFetchEventById('evt-unknown'));

    await expect(capturedQueryFn!({ signal: undefined })).resolves.toBeNull();
  });
});
