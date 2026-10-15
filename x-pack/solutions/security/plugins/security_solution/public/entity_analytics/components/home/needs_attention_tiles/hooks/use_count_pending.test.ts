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

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));
jest.mock('../../../../../common/components/ml/hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobsIds: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;

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
      isFetching: false,
      error: undefined,
      ...overrides,
    });
  const pending = (props: object = {}) =>
    renderHook(() => useCount({ spaceId: 'default', ...props })).result.current.isCountPending;

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
    query({ isLoading: true, isFetching: true });
    expect(pending()).toBe(true);
    query({ data: { count: 3 }, isLoading: false, isFetching: true });
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
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, isFetching: false });
  });
  const pending = () =>
    renderHook(() => useEntitiesWithAnomaliesCount({ spaceId: 'default' })).result.current
      .isCountPending;

  it('waits while the installed jobs load', () => {
    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({ jobIds: [], loading: true });
    expect(pending()).toBe(true);
  });

  it('does not wait forever when no security job is installed', () => {
    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({ jobIds: [], loading: false });
    expect(pending()).toBe(false);
  });
});
