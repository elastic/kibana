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
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import { anomaliesSeriesColumn } from '../queries/entities_with_anomalies_series_query';
import { useEntitiesWithAnomaliesSeries } from './use_entities_with_anomalies_series';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/components/ml/hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobsIds: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockSearch = jest.fn();
const DOTS = Array.from({ length: 24 }, (_, i) => 10 + i);
const queryResult = (overrides = {}) => ({
  data: DOTS,
  isFetching: false,
  isError: false,
  ...overrides,
});
const opts = {
  spaceId: 'default',
  timeRange: '24h' as const,
  isReady: true,
  reachesBack: true,
  count: 7,
};
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];

describe('useEntitiesWithAnomaliesSeries', () => {
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
    mockUseQuery.mockReturnValue(queryResult());
  });

  it('returns the dots, ending on the live count', () => {
    const { result } = renderHook(() => useEntitiesWithAnomaliesSeries(opts));
    expect(result.current.trend?.slice(0, -1)).toEqual(DOTS.slice(0, -1));
    expect(result.current.trend?.[DOTS.length - 1]).toBe(7);
    expect(result.current.isTrendLoading).toBe(false);
  });

  it('holds the query back until the count and delta have loaded, and when skipped', () => {
    renderHook(() => useEntitiesWithAnomaliesSeries({ ...opts, isReady: false }));
    expect(lastCall()[2].enabled).toBe(false);
    renderHook(() => useEntitiesWithAnomaliesSeries({ ...opts, skip: true }));
    expect(lastCall()[2].enabled).toBe(false);
    renderHook(() => useEntitiesWithAnomaliesSeries(opts));
    expect(lastCall()[2].enabled).toBe(true);
  });

  it('does not run while the jobs or the index load, or when no job is installed', () => {
    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({
      jobIds: ['job_a'],
      loading: true,
    });
    renderHook(() => useEntitiesWithAnomaliesSeries(opts));
    expect(lastCall()[2].enabled).toBe(false);

    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({ jobIds: [], loading: false });
    renderHook(() => useEntitiesWithAnomaliesSeries(opts));
    expect(lastCall()[2].enabled).toBe(false);
  });

  it('leaves the line out, with no spinner and no query, when the history is too short', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() =>
      useEntitiesWithAnomaliesSeries({ ...opts, reachesBack: false })
    );
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current).toEqual({ trend: undefined, isTrendLoading: false });
  });

  it('leaves the line out, with no spinner and no query, when the count is 0', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() => useEntitiesWithAnomaliesSeries({ ...opts, count: 0 }));
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current).toEqual({ trend: undefined, isTrendLoading: false });
  });

  it('waits for the history check before it decides, with the spinner on', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    const { result } = renderHook(() =>
      useEntitiesWithAnomaliesSeries({ ...opts, isReady: false, reachesBack: undefined })
    );
    expect(lastCall()[2].enabled).toBe(false);
    expect(result.current.isTrendLoading).toBe(true);
  });

  it('stops the spinner when no job is installed or no index resolves, but not while loading', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined }));
    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({ jobIds: [], loading: false });
    expect(
      renderHook(() => useEntitiesWithAnomaliesSeries(opts)).result.current.isTrendLoading
    ).toBe(false);

    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({ jobIds: [], loading: true });
    expect(
      renderHook(() => useEntitiesWithAnomaliesSeries(opts)).result.current.isTrendLoading
    ).toBe(true);

    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({
      jobIds: ['job_a'],
      loading: false,
    });
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    expect(
      renderHook(() => useEntitiesWithAnomaliesSeries(opts)).result.current.isTrendLoading
    ).toBe(false);
  });

  it('shows no line and a spinner while loading, none and no spinner after an error', () => {
    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isFetching: true }));
    const loading = renderHook(() => useEntitiesWithAnomaliesSeries(opts));
    expect(loading.result.current).toEqual({ trend: undefined, isTrendLoading: true });

    mockUseQuery.mockReturnValue(queryResult({ data: undefined, isError: true }));
    const failed = renderHook(() => useEntitiesWithAnomaliesSeries(opts));
    expect(failed.result.current).toEqual({ trend: undefined, isTrendLoading: false });
  });

  it('runs the series query with the installed jobs and reads its columns', async () => {
    const columns = Array.from({ length: 24 }, (_, k) => ({ name: anomaliesSeriesColumn(k) }));
    mockSearch.mockReturnValue(
      of({ rawResponse: { columns, values: [columns.map((_, i) => i)] } })
    );
    renderHook(() => useEntitiesWithAnomaliesSeries(opts));
    const [key, queryFn] = lastCall();
    expect(key[0]).toBe('entitiesWithAnomaliesSeries');
    expect(key[1]).toContain('job_id IN ("job_a")');
    const dots = await queryFn({ signal: undefined });
    expect(dots[0]).toBe(23);
    expect(dots[23]).toBe(0);
  });

  it('applies the entity filters, as the count does', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = buildEntityFilterClauses(entityFilters);
    expect(clauses.length).toBeGreaterThan(0);
    renderHook(() => useEntitiesWithAnomaliesSeries({ ...opts, entityFilters }));
    clauses.forEach((clause) => expect(lastCall()[0][1]).toContain(clause));
    renderHook(() => useEntitiesWithAnomaliesSeries(opts));
    clauses.forEach((clause) => expect(lastCall()[0][1]).not.toContain(clause));
  });
});
