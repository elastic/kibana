/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { renderHook, waitFor } from '@testing-library/react';
import {
  applyEntityStoreSearchCachePatch,
  ENTITY_FROM_STORE_QUERY_KEY,
  useEntityFromStore,
  type EntityStoreRecord,
} from './use_entity_from_store';
import {
  buildEntityIdFilter,
  RESOLVED_MODE_MAX_RECORDS,
  RESOLVED_TO_FIELD,
} from '../../../../../common/entity_analytics/entity_store/resolution_group';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';

const mockFetchEntitiesListV2 = jest.fn();
const mockGetEuidFilterBasedOnDocument = jest.fn();

jest.mock('@kbn/entity-store/public', () => ({
  useEntityStoreEuidApi: () => ({
    euid: {
      dsl: {
        getEuidFilterBasedOnDocument: mockGetEuidFilterBasedOnDocument,
      },
    },
    getBuiltInEntityDefinition: jest.requireActual('@kbn/entity-store/common/euid_helpers')
      .getBuiltInEntityDefinition,
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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function createWrapper(queryClient = createQueryClient()) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

const hostRecord = (id: string, criticality?: string): EntityStoreRecord =>
  ({
    entity: { id, name: id, type: 'host' },
    host: { name: id },
    ...(criticality ? { asset: { criticality } } : {}),
  } as unknown as EntityStoreRecord);

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
        getBuiltInEntityDefinition('host'),
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

  describe('entityId path (single mode)', () => {
    it('queries the id with a term filter and perPage 1 by default', async () => {
      mockFetchEntitiesListV2.mockResolvedValue({ records: [hostRecord('host-1')] });

      const { result } = renderHook(
        () => useEntityFromStore({ entityId: 'host-1', entityType: 'host', skip: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.entityRecord).not.toBeNull());

      const [{ params }] = mockFetchEntitiesListV2.mock.calls[0];
      expect(JSON.parse(params.filterQuery)).toEqual({
        bool: { filter: [{ term: { 'entity.id': 'host-1' } }] },
      });
      expect(params.perPage).toBe(1);
      expect(result.current.entityRecord?.entity?.id).toBe('host-1');
      expect(result.current.aliasRecords).toEqual([]);
    });

    it('returns a null entityRecord when the returned record does not match entityId', async () => {
      mockFetchEntitiesListV2.mockResolvedValue({ records: [hostRecord('other-host')] });

      const { result } = renderHook(
        () => useEntityFromStore({ entityId: 'host-1', entityType: 'host', skip: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
      expect(result.current.entityRecord).toBeNull();
      expect(result.current.entity).toBeNull();
    });

    it('ignores identityFields when entityId is supplied', async () => {
      mockFetchEntitiesListV2.mockResolvedValue({ records: [hostRecord('a')] });

      renderHook(
        () =>
          useEntityFromStore({
            entityId: 'a',
            identityFields: { 'host.name': 'web01' },
            entityType: 'host',
            skip: false,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetchEntitiesListV2).toHaveBeenCalled());
      const [{ params }] = mockFetchEntitiesListV2.mock.calls[0];
      expect(params.filterQuery).toContain('"entity.id"');
      expect(params.filterQuery).not.toContain('host.name');
    });
  });

  describe('entityId path (resolved mode)', () => {
    it('matches the target on entity.id or aliases on resolved_to, with a widened perPage', async () => {
      mockFetchEntitiesListV2.mockResolvedValue({
        records: [hostRecord('alias-1'), hostRecord('target'), hostRecord('alias-2')],
      });

      const { result } = renderHook(
        () =>
          useEntityFromStore({
            entityId: 'target',
            mode: 'resolved',
            entityType: 'host',
            skip: false,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.entityRecord).not.toBeNull());

      const [{ params }] = mockFetchEntitiesListV2.mock.calls[0];
      expect(JSON.parse(params.filterQuery)).toEqual({
        bool: {
          should: [
            { term: { 'entity.id': 'target' } },
            { term: { 'entity.relationships.resolution.resolved_to': 'target' } },
          ],
          minimum_should_match: 1,
        },
      });
      expect(params.perPage).toBe(RESOLVED_MODE_MAX_RECORDS);
      // The primary record is the target, not necessarily the first hit; aliases exclude it.
      expect(result.current.entityRecord?.entity?.id).toBe('target');
      expect(result.current.aliasRecords.map((r) => r.entity?.id)).toEqual(['alias-1', 'alias-2']);
    });

    it('returns a null entityRecord rather than promoting an alias when the target itself is not returned', async () => {
      mockFetchEntitiesListV2.mockResolvedValue({
        records: [hostRecord('alias-1'), hostRecord('alias-2')],
      });

      const { result } = renderHook(
        () =>
          useEntityFromStore({
            entityId: 'target',
            mode: 'resolved',
            entityType: 'host',
            skip: false,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
      expect(result.current.entityRecord).toBeNull();
      expect(result.current.entity).toBeNull();
      expect(result.current.aliasRecords.map((r) => r.entity?.id)).toEqual(['alias-1', 'alias-2']);
    });

    it('returns no aliases when only the target resolves', async () => {
      mockFetchEntitiesListV2.mockResolvedValue({ records: [hostRecord('target')] });

      const { result } = renderHook(
        () =>
          useEntityFromStore({
            entityId: 'target',
            mode: 'resolved',
            entityType: 'host',
            skip: false,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.entityRecord).not.toBeNull());
      expect(result.current.aliasRecords).toEqual([]);
    });

    it('uses distinct query caches for single and resolved mode of the same id', async () => {
      const queryClient = createQueryClient();
      mockFetchEntitiesListV2.mockResolvedValue({ records: [hostRecord('target')] });

      const { rerender } = renderHook(
        ({ mode }: { mode: 'single' | 'resolved' }) =>
          useEntityFromStore({ entityId: 'target', mode, entityType: 'host', skip: false }),
        { wrapper: createWrapper(queryClient), initialProps: { mode: 'single' } }
      );
      await waitFor(() => expect(mockFetchEntitiesListV2).toHaveBeenCalledTimes(1));

      rerender({ mode: 'resolved' });
      await waitFor(() => expect(mockFetchEntitiesListV2).toHaveBeenCalledTimes(2));

      const keys = queryClient
        .getQueryCache()
        .getAll()
        .map((query: { queryKey: unknown[] }) => query.queryKey[3]);
      expect(keys).toEqual(expect.arrayContaining(['id:target', 'resolved:target']));
    });

    it('falls back to identityFields when resolved mode is requested without an entityId', async () => {
      renderHook(
        () =>
          useEntityFromStore({
            mode: 'resolved',
            identityFields: { 'host.name': 'web01' },
            entityType: 'host',
            skip: false,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetchEntitiesListV2).toHaveBeenCalled());
      const [{ params }] = mockFetchEntitiesListV2.mock.calls[0];
      expect(params.filterQuery).toContain('host.name');
      expect(params.filterQuery).not.toContain(RESOLVED_TO_FIELD);
      expect(params.perPage).toBe(1);
    });
  });

  describe('buildEntityIdFilter', () => {
    it('builds a term filter in single mode', () => {
      expect(buildEntityIdFilter('x', 'single')).toEqual({
        bool: { filter: [{ term: { 'entity.id': 'x' } }] },
      });
    });

    it('builds a should filter over entity.id and resolved_to in resolved mode', () => {
      expect(buildEntityIdFilter('x', 'resolved')).toEqual({
        bool: {
          should: [{ term: { 'entity.id': 'x' } }, { term: { [RESOLVED_TO_FIELD]: 'x' } }],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('applyEntityStoreSearchCachePatch', () => {
    it('replaces the matching record wherever it sits in the cached list', () => {
      const queryClient = createQueryClient();
      const queryKey = [ENTITY_FROM_STORE_QUERY_KEY, 'host', 'a', 'resolved:a', false, 'a'];
      queryClient.setQueryData(queryKey, {
        records: [hostRecord('a'), hostRecord('b')],
      });

      applyEntityStoreSearchCachePatch(queryClient, 'host', hostRecord('b', 'high_impact'));

      const cached = queryClient.getQueryData(queryKey) as
        | { records: EntityStoreRecord[] }
        | undefined;
      expect(cached?.records.map((r: EntityStoreRecord) => r.entity?.id)).toEqual(['a', 'b']);
      expect(cached?.records[1].asset?.criticality).toBe('high_impact');
      expect(cached?.records[0].asset).toBeUndefined();
    });

    it('leaves caches untouched when no record matches', () => {
      const queryClient = createQueryClient();
      const queryKey = [ENTITY_FROM_STORE_QUERY_KEY, 'host', 'a', 'id:a', false, 'a'];
      const previous = { records: [hostRecord('a')] };
      queryClient.setQueryData(queryKey, previous);

      applyEntityStoreSearchCachePatch(queryClient, 'host', hostRecord('zzz', 'high_impact'));

      expect(queryClient.getQueryData(queryKey)).toBe(previous);
    });
  });

  describe('executionContext propagation', () => {
    it('forwards the caller-supplied executionContext to fetchEntitiesListV2', async () => {
      const executionContext = buildExecutionContext(
        EA_EXECUTION_CONTEXT_NAMES.ENTITY_DETAILS_FLYOUT,
        'host_entity_from_store'
      );

      renderHook(
        () =>
          useEntityFromStore({
            identityFields: { 'host.name': 'web01' },
            entityType: 'host',
            skip: false,
            executionContext,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockFetchEntitiesListV2).toHaveBeenCalled());

      const [callArg] = mockFetchEntitiesListV2.mock.calls[0];
      expect(callArg.context).toEqual({
        child: {
          type: 'security_solution',
          name: 'entity_analytics:entity_details_flyout',
          id: 'host_entity_from_store',
        },
      });
    });

    it('omits context when the caller does not supply executionContext', async () => {
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

      const [callArg] = mockFetchEntitiesListV2.mock.calls[0];
      expect(callArg.context).toBeUndefined();
    });
  });
});
