/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import { useRiskLevelsEsqlQuery } from './use_risk_levels_esql_query';
import { useKibana } from '../../../../../common/lib/kibana';
import { useEsqlGlobalFilterQuery } from '../../../../../common/hooks/esql/use_esql_global_filter';
import { useGlobalFilterQuery } from '../../../../../common/hooks/use_global_filter_query';

vi.mock('@kbn/esql-utils', () => {
  const mocked = {
    prettifyQuery: vi.fn((query) => query),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/react-query', () => {
  const mocked = {
    useQuery: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../common/hooks/use_error_toast', () => {
  const mocked = {
    useErrorToast: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../common/hooks/esql/use_esql_global_filter', () => {
  const mocked = {
    useEsqlGlobalFilterQuery: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../common/hooks/use_global_filter_query', () => {
  const mocked = {
    useGlobalFilterQuery: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useRiskLevelsEsqlQuery', () => {
  const mockUseKibana = useKibana as Mock;
  const mockUseEsqlGlobalFilterQuery = useEsqlGlobalFilterQuery as Mock;
  const mockUseGlobalFilterQuery = useGlobalFilterQuery as Mock;
  const mockUseQuery = useQuery as Mock;

  const mockRefetchQuery = vi.fn();
  const mockSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          columns: [{ name: 'count' }, { name: 'level' }],
          values: [[5, 'Critical']],
        },
        requestParams: {},
      })
    );

    mockUseKibana.mockReturnValue({
      services: {
        data: {
          search: {
            search: mockSearch,
          },
        },
      },
    });

    mockUseEsqlGlobalFilterQuery.mockReturnValue('mock-filter-with-time');
    mockUseGlobalFilterQuery.mockReturnValue({ filterQuery: 'mock-filter-no-time' });

    mockUseQuery.mockImplementation((queryKey, queryFn, options) => {
      return {
        data: {
          response: {
            columns: [{ name: 'count' }, { name: 'level' }],
            values: [[5, 'Critical']],
          },
        },
        error: undefined,
        isError: false,
        isFetching: false,
        isRefetching: false,
        refetch: mockRefetchQuery,
      };
    });
  });

  it('should format returned esql results into records correctly', () => {
    const { result } = renderHook(() => useRiskLevelsEsqlQuery({ spaceId: 'default' }));

    expect(result.current.records).toEqual([{ count: 5, level: 'Critical' }]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasEngineBeenInstalled).toBe(true);
  });

  it('should call refetch when refetch is called', () => {
    const { result } = renderHook(() => useRiskLevelsEsqlQuery({ spaceId: 'default' }));

    result.current.refetch();

    expect(mockRefetchQuery).toHaveBeenCalled();
  });

  it('should generate correct query with watchlistId', () => {
    renderHook(() => useRiskLevelsEsqlQuery({ spaceId: 'default', watchlistId: 'test-watchlist' }));

    const queryKey = mockUseQuery.mock.calls[0][0];
    const generatedQuery = queryKey[1];

    expect(generatedQuery).toContain('FROM entities-latest-default');
    expect(generatedQuery).toContain('MV_CONTAINS(entity.attributes.watchlists, "test-watchlist")');
  });

  it('should include prebuilt watchlist id in MV_CONTAINS filter', () => {
    renderHook(() =>
      useRiskLevelsEsqlQuery({ spaceId: 'default', watchlistId: 'privileged_watchlist_id' })
    );

    const queryKey = mockUseQuery.mock.calls[0][0];
    const generatedQuery = queryKey[1];

    expect(generatedQuery).toContain(
      'MV_CONTAINS(entity.attributes.watchlists, "privileged_watchlist_id")'
    );
  });

  it('should set enabled to false if skip is true', () => {
    renderHook(() => useRiskLevelsEsqlQuery({ spaceId: 'default', skip: true }));

    const options = mockUseQuery.mock.calls[0][2];
    expect(options.enabled).toBe(false);
  });

  it('uses the ESQL global time filter by default', async () => {
    renderHook(() => useRiskLevelsEsqlQuery({ spaceId: 'default' }));

    const queryFn = mockUseQuery.mock.calls[0][1];

    await queryFn({ signal: undefined });

    expect(mockSearch.mock.calls[0][0].params).toEqual(
      expect.objectContaining({ filter: 'mock-filter-with-time' })
    );
  });

  it('skips the global time filter when applyGlobalTimeFilter is false', async () => {
    renderHook(() => useRiskLevelsEsqlQuery({ spaceId: 'default', applyGlobalTimeFilter: false }));

    const queryFn = mockUseQuery.mock.calls[0][1];

    await queryFn({ signal: undefined });

    expect(mockSearch.mock.calls[0][0].params).toEqual(
      expect.objectContaining({ filter: 'mock-filter-no-time' })
    );
  });

  it('pins the entity-store query to the origin project via projectRouting for CPS', async () => {
    renderHook(() => useRiskLevelsEsqlQuery({ spaceId: 'default' }));

    const queryFn = mockUseQuery.mock.calls[0][1];

    await queryFn({ signal: undefined });

    expect(mockSearch.mock.calls[0][1]).toEqual(
      expect.objectContaining({ projectRouting: '_alias:_origin' })
    );
  });
});
