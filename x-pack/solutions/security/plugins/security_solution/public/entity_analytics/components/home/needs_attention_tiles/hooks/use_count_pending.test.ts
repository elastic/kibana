/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../common/lib/kibana';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { useAlertBasedTiles } from './use_entities_with_alerts_tiles';
import { useEntitiesWithAnomaliesCount } from './use_entities_with_anomalies_count';
import { useNewEntityCount } from './use_new_entity_count';
import { useNewlyHighCriticalCount } from './use_newly_high_critical_count';
import { useRiskMoversCount } from './use_risk_movers_count';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { TileQueryTimeoutError, retryUnlessTimedOut } from './tile_query_timeout';
import { useTileQueryInputs } from './use_tile_query_inputs';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));
jest.mock('../../../../../common/components/ml/hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobsIds: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));

jest.mock('./use_tile_query_inputs', () => {
  const actual = jest.requireActual('./use_tile_query_inputs');
  return { useTileQueryInputs: jest.fn(actual.useTileQueryInputs) };
});

const mockUseQuery = useQuery as jest.Mock;
const actualUseTileQueryInputs = jest.requireActual('./use_tile_query_inputs').useTileQueryInputs;

/*
 * "Count first, for the whole page" waits for every count. React Query 4 reports `isLoading` as
 * true for a query that is disabled and has no data, so `isLoading` cannot say "the count is on its
 * way": a tile whose query can never run (skipped, no entities index, no ML job) would block every
 * delta forever. `isCountPending` is true only while a count can still arrive.
 */
describe.each([
  ['useAlertBasedTiles', useAlertBasedTiles],
  ['useEntitiesWithAnomaliesCount', useEntitiesWithAnomaliesCount],
  ['useNewEntityCount', useNewEntityCount],
  ['useRiskMoversCount', useRiskMoversCount],
  ['useNewlyHighCriticalCount', useNewlyHighCriticalCount],
] as const)('%s', (_name, useCount) => {
  const query = (overrides = {}) =>
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isInitialLoading: false,
      isFetching: false,
      error: undefined,
      ...overrides,
    });
  const render = (props: object = {}) =>
    renderHook(() => useCount({ spaceId: 'default', ...props })).result.current;
  const pending = (props: object = {}) => render(props).isCountPending;

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { search: { search: jest.fn() } } },
    });
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: { indexName: '.entities-v1' },
      isLoading: false,
    });
    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({
      jobIds: ['job_a'],
      loading: false,
    });
    query();
  });

  it('keeps its result for an hour, so a range that is left and revisited is not fetched again', () => {
    query();
    renderHook(() => useCount({ spaceId: 'default' }));
    const options = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][2];
    expect(options.staleTime).toBe(60 * 60_000);
    // Default is 5 minutes, which would drop the result of a range left unused for that long.
    expect(options.cacheTime).toBe(60 * 60_000);
  });

  it('is true while the count loads for the first time and while it refetches', () => {
    query({ isLoading: true, isInitialLoading: true, isFetching: true });
    expect(pending()).toBe(true);
    query({ data: { count: 3 }, isFetching: true });
    expect(pending()).toBe(true);
  });

  it('is false once the count has settled, also after an error', () => {
    query({ data: { count: 3 } });
    expect(pending()).toBe(false);
    query({ error: new Error('boom') });
    expect(pending()).toBe(false);
  });

  it('is true while the entities index resolves', () => {
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    expect(pending()).toBe(true);
  });

  it('is false when the query can never run, although React Query reports it as loading', () => {
    // Skipped, or the entities index never resolves: the query is disabled and has no data.
    query({ isLoading: true });
    expect(pending({ skip: true })).toBe(false);

    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    expect(pending()).toBe(false);
  });

  it('says it timed out, without a toast of its own (the page shows one for every tile)', () => {
    query({ error: new TileQueryTimeoutError() });
    const result = renderHook(() => useCount({ spaceId: 'default' })).result.current;
    expect(result.isTimedOut).toBe(true);
    expect(result.isLoading).toBe(false);
    const toastCalls = (useErrorToast as jest.Mock).mock.calls;
    expect(toastCalls[toastCalls.length - 1][1]).toBeUndefined();
  });

  it('says it timed out, without a toast, when the group filter lookup timed out', () => {
    (useTileQueryInputs as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new TileQueryTimeoutError(),
      entityFilterClauses: [],
    });
    const result = renderHook(() => useCount({ spaceId: 'default' })).result.current;
    (useTileQueryInputs as jest.Mock).mockImplementation(actualUseTileQueryInputs);
    expect(result.isTimedOut).toBe(true);
    const toastCalls = (useErrorToast as jest.Mock).mock.calls;
    expect(toastCalls[toastCalls.length - 1][1]).toBeUndefined();
  });

  it('shows no count from an earlier fetch when the refetch timed out', () => {
    query({
      data: { count: 7, severeAlertsCount: 7, entityIds: ['a'] },
      error: new TileQueryTimeoutError(),
    });
    const result = renderHook(() => useCount({ spaceId: 'default' })).result.current;
    expect(result.isTimedOut).toBe(true);
    expect(result).not.toHaveProperty('count', 7);
    expect(result).not.toHaveProperty('severeAlertsCount', 7);
  });

  it('reports other errors as before, with a toast, and does not call them a timeout', () => {
    const error = new Error('boom');
    query({ error });
    const result = renderHook(() => useCount({ spaceId: 'default' })).result.current;
    expect(result.isTimedOut).toBe(false);
    const toastCalls = (useErrorToast as jest.Mock).mock.calls;
    expect(toastCalls[toastCalls.length - 1][1]).toBe(error);
  });

  it('retries an error once but not a timeout', () => {
    renderHook(() => useCount({ spaceId: 'default' }));
    const countOptions = mockUseQuery.mock.calls
      .map((call) => call[2])
      .filter((options) => options?.retry !== undefined)
      .pop();
    expect(countOptions.retry).toBe(retryUnlessTimedOut);
  });

  it('stops the spinner when the query can never run, so the tile settles instead of loading for ever', () => {
    const loading = () =>
      renderHook(() => useCount({ spaceId: 'default' })).result.current.isLoading;
    query({ isLoading: true });
    expect(render({ skip: true }).isLoading).toBe(false);
    // No latest entities index, or its lookup failed: the query is disabled and has no data.
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: { indexName: null },
      isLoading: false,
    });
    expect(loading()).toBe(false);
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });
    expect(loading()).toBe(false);
    // Still loading while the index resolves.
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    expect(loading()).toBe(true);
  });
});

describe('useEntitiesWithAnomaliesCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { search: { search: jest.fn() } } },
    });
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: { indexName: '.entities-v1' },
      isLoading: false,
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isInitialLoading: false,
      isFetching: false,
    });
  });
  const pending = () =>
    renderHook(() => useEntitiesWithAnomaliesCount({ spaceId: 'default' })).result.current
      .isCountPending;
  const missingJobs = () =>
    renderHook(() => useEntitiesWithAnomaliesCount({ spaceId: 'default' })).result.current
      .isMissingJobs;
  // An ML user with a licence whose jobs fetch succeeded, unless a test says otherwise.
  const jobs = (overrides = {}) =>
    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({
      jobIds: [],
      loading: false,
      isMlUser: true,
      isLicensed: true,
      isError: false,
      ...overrides,
    });

  it('waits while the installed jobs load', () => {
    jobs({ loading: true });
    expect(pending()).toBe(true);
  });

  it('does not wait forever when no security job is installed', () => {
    jobs();
    expect(pending()).toBe(false);
  });

  it('stops loading and says the jobs are missing when no security job is installed', () => {
    // The count query is disabled, which react-query reports as loading with no data.
    jobs();
    const { isLoading, isMissingJobs } = renderHook(() =>
      useEntitiesWithAnomaliesCount({ spaceId: 'default' })
    ).result.current;
    expect(isLoading).toBe(false);
    expect(isMissingJobs).toBe(true);
  });

  // The jobs list is empty in each of these too, but that does not mean no job is installed.
  it.each([
    ['the user has no ML permission', { isMlUser: false }],
    ['there is no ML licence', { isLicensed: false }],
    ['the jobs fetch failed', { isError: true }],
    ['the jobs are loading', { loading: true }],
    ['a job is installed', { jobIds: ['job_a'] }],
  ])('does not say the jobs are missing when %s', (_case, overrides) => {
    jobs(overrides);
    expect(missingJobs()).toBe(false);
  });

  it('stops loading when the jobs cannot be asked for or their fetch failed', () => {
    jobs({ isMlUser: false });
    expect(pending()).toBe(false);
    jobs({ isError: true });
    expect(pending()).toBe(false);
  });

  it('does not spin forever when no security job is installed', () => {
    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({ jobIds: [], loading: false });
    expect(
      renderHook(() => useEntitiesWithAnomaliesCount({ spaceId: 'default' })).result.current
        .isLoading
    ).toBe(false);
  });
});
