/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../common/lib/kibana';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { useEntitiesWithAnomaliesCountWithDelta } from './use_entities_with_anomalies_count_with_delta';
import { useEntitiesWithAnomaliesCount } from './use_entities_with_anomalies_count';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/components/ml/hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobsIds: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));
jest.mock('./use_entities_with_anomalies_count', () => ({
  useEntitiesWithAnomaliesCount: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockMain = useEntitiesWithAnomaliesCount as jest.Mock;
const mockSearch = jest.fn();

const mainResult = (overrides = {}) => ({
  count: 50,
  entityIds: [],
  isLoading: false,
  error: undefined,
  ...overrides,
});

const queryResult = (overrides = {}) => ({
  data: 40,
  isFetching: false,
  isError: false,
  ...overrides,
});

const opts = { spaceId: 'default', timeRange: '30d' as const };
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];

describe('useEntitiesWithAnomaliesCountWithDelta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { search: { search: mockSearch } } },
    });
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: { indexName: '.entities-v1' },
      isLoading: false,
    });
    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({
      jobIds: ['job_a'],
      loading: false,
    });
    mockMain.mockReturnValue(mainResult());
    mockUseQuery.mockReturnValue(queryResult());
  });

  it('computes the delta as the count minus the previous period', () => {
    const { result } = renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(result.current.delta).toBe(10);
    expect(result.current.isDeltaLoading).toBe(false);
    expect(result.current.count).toBe(50);
  });

  it('holds the previous-period query back until the count has loaded', () => {
    mockMain.mockReturnValue(mainResult({ isLoading: true }));
    renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(lastCall()[2].enabled).toBe(false);

    mockMain.mockReturnValue(mainResult());
    renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(lastCall()[2].enabled).toBe(true);
  });

  it('does not run when skipped, while the jobs load, or when no job is installed', () => {
    renderHook(() => useEntitiesWithAnomaliesCountWithDelta({ ...opts, skip: true }));
    expect(lastCall()[2].enabled).toBe(false);

    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({ jobIds: [], loading: false });
    renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(lastCall()[2].enabled).toBe(false);

    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({
      jobIds: ['job_a'],
      loading: true,
    });
    renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(lastCall()[2].enabled).toBe(false);
  });

  it('shows no delta and a spinner while the previous period loads, also for a stale range', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isFetching: true }));
    const first = renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(first.result.current.delta).toBeUndefined();
    expect(first.result.current.isDeltaLoading).toBe(true);

    mockUseQuery.mockReturnValue(queryResult({ isFetching: true }));
    const stale = renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(stale.result.current.delta).toBeUndefined();
    expect(stale.result.current.isDeltaLoading).toBe(true);
  });

  it('shows neither a delta nor a spinner when the previous-period query fails, and keeps the count', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isError: true }));
    const { result } = renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(result.current.delta).toBeUndefined();
    expect(result.current.isDeltaLoading).toBe(false);
    expect(result.current.count).toBe(50);
  });

  it('runs the same anomalies query for the previous period, with the installed jobs', async () => {
    mockSearch.mockReturnValue(
      of({
        rawResponse: { columns: [{ name: 'value' }, { name: 'entity_ids' }], values: [[7, ['x']]] },
      })
    );
    renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    const [key, queryFn] = lastCall();
    expect(key[0]).toBe('entitiesWithAnomaliesCountPrevPeriod');
    expect(key[1]).toContain('@timestamp >= NOW() - 60 days AND @timestamp < NOW() - 30 days');
    expect(key[1]).toContain('job_id IN ("job_a")');
    expect(await queryFn({ signal: undefined })).toBe(7);
    expect(mockSearch).toHaveBeenCalledWith(
      { params: { query: key[1] } },
      expect.objectContaining({ strategy: 'esql_async' })
    );
  });

  it('counts an empty result as 0', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { columns: [], values: [] } }));
    renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(await lastCall()[1]({ signal: undefined })).toBe(0);
  });

  it('keeps the previous period fresh for 30 minutes', () => {
    renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
    expect(lastCall()[2].staleTime).toBe(30 * 60_000);
  });
});
