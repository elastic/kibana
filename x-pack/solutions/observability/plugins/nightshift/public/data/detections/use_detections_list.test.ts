/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDetectionsList } from './use_detections_list';

const mockSignificantEventsFetch = jest.fn();

jest.mock('@kbn/data-plugin/common', () => ({
  getAbsoluteTimeRange: () => ({
    from: '2026-10-22T12:00:00.000Z',
    to: '2026-10-23T12:00:00.000Z',
  }),
}));
jest.mock('../../hooks/use_fetch_error_toast', () => ({
  useFetchErrorToast: () => jest.fn(),
}));
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
  useQuery: (params: { queryFn: (args: { signal?: AbortSignal }) => Promise<unknown> }) => {
    capturedQueryFn = params.queryFn;
    return { data: undefined, isLoading: true };
  },
}));

describe('useDetectionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves relative time ranges before requesting detections', async () => {
    mockSignificantEventsFetch.mockResolvedValue({ hits: [], page: 2, perPage: 25, total: 0 });

    renderHook(() =>
      useDetectionsList({
        from: 'now-24h',
        to: 'now',
        page: 2,
        perPage: 25,
        search: 'latency',
        change_point_type: ['spike'],
        entityIds: ['service.name:checkout'],
        unassignedEntities: true,
      })
    );

    await capturedQueryFn!({ signal: undefined });

    expect(mockSignificantEventsFetch).toHaveBeenCalledWith(
      'GET /internal/significant_events/detections',
      {
        params: {
          query: {
            page: 2,
            perPage: 25,
            from: '2026-10-22T12:00:00.000Z',
            to: '2026-10-23T12:00:00.000Z',
            search: 'latency',
            change_point_type: ['spike'],
            entityIds: ['service.name:checkout'],
            unassignedEntities: true,
          },
        },
        signal: null,
      }
    );
  });
});
