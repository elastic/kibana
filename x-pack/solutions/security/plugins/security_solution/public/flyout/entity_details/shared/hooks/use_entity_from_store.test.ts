/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useEntityFromStore } from './use_entity_from_store';

const mockFetchEntitiesListV2 = jest.fn();
const mockGetEuidFilterBasedOnDocument = jest.fn();

jest.mock('@kbn/entity-store/public', () => ({
  useEntityStoreEuidApi: () => ({
    euid: {
      dsl: {
        getEuidFilterBasedOnDocument: mockGetEuidFilterBasedOnDocument,
      },
    },
  }),
}));

jest.mock('../../../../entity_analytics/api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    fetchEntitiesListV2: mockFetchEntitiesListV2,
  }),
}));

// QueryClientProvider wrapper required by useQuery.
const { QueryClient, QueryClientProvider } = jest.requireActual('@kbn/react-query');
const React = jest.requireActual('react');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchEntitiesListV2.mockResolvedValue({ records: [] });
  // Return a simple term filter (no host.id exclusion) — same as the real partial-identity lookup.
  mockGetEuidFilterBasedOnDocument.mockReturnValue({
    bool: { filter: [{ term: { 'host.name': 'web01' } }] },
  });
});

describe('useEntityFromStore', () => {
  describe('documentFilter path (identityFields supplied, no entityId)', () => {
    it('builds the filter with excludeHigherRankedFields: false so host.name-only lookups succeed', async () => {
      renderHook(
        () =>
          useEntityFromStore({
            identityFields: { 'host.name': 'web01' },
            entityType: 'host',
            skip: false,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetchEntitiesListV2).toHaveBeenCalled());

      // Partition semantics must be disabled for the lookup (wiring check, #278276).
      expect(mockGetEuidFilterBasedOnDocument).toHaveBeenCalledWith(
        'host',
        { 'host.name': 'web01' },
        { excludeHigherRankedFields: false }
      );

      // The filterQuery forwarded to the API must not contain a host.id exclusion clause.
      const [{ params }] = mockFetchEntitiesListV2.mock.calls[0];
      const parsed = JSON.parse(params.filterQuery ?? '{}');
      const mustClauses = parsed?.bool?.must ?? [];
      const hasHostIdExclusion = JSON.stringify(mustClauses).includes('host.id');
      expect(hasHostIdExclusion).toBe(false);
    });
  });
});
