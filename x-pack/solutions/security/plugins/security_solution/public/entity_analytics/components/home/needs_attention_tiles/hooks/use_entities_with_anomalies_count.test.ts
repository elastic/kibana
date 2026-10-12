/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useKibana } from '../../../../../common/lib/kibana';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import {
  useEntitiesWithAnomaliesCount,
  useEntitiesWithAnomaliesCountWithDelta,
} from './use_entities_with_anomalies_count';
import { useTrailingTileSeries } from './use_trailing_tile_series';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@kbn/entity-store/public', () => ({ useEntityStoreEuidApi: jest.fn() }));
jest.mock('../../../../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/components/ml/hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobsIds: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));
jest.mock('./use_trailing_tile_series', () => ({ useTrailingTileSeries: jest.fn() }));

const mockUseQuery = useQuery as jest.Mock;
const mockUseEuidApi = useEntityStoreEuidApi as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUseJobs = useInstalledSecurityJobsIds as jest.Mock;
const mockUseIndex = useResolvedLatestEntitiesIndexName as jest.Mock;
const mockUseTrailing = useTrailingTileSeries as jest.Mock;

const euid = {
  esql: {
    getFieldEvaluations: () => undefined,
    getEuidEvaluation: (_type: string, varName: string) => `${varName} = "x"`,
  },
};

// What react-query v4 reports for a query that is switched off and has no data yet.
const switchedOffQuery = {
  data: undefined,
  isLoading: true,
  isInitialLoading: false,
  isFetching: false,
  error: undefined,
};
const loadedQuery = { ...switchedOffQuery, data: { count: 4, entityIds: ['a'] }, isLoading: false };

const opts = { spaceId: 'default', timeRange: '7d' as const };
const lastTrailingArgs = () => mockUseTrailing.mock.calls[mockUseTrailing.mock.calls.length - 1][0];

describe('Entities with anomalies tile hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { data: { search: { search: jest.fn() } } } });
    mockUseEuidApi.mockReturnValue({ euid });
    mockUseIndex.mockReturnValue({ data: { indexName: '.entities-v1' }, isLoading: false });
    mockUseJobs.mockReturnValue({ jobIds: ['job_a'], loading: false });
    mockUseQuery.mockReturnValue(loadedQuery);
    mockUseTrailing.mockReturnValue({ values: [1, 2, 3], isLoading: false });
  });

  describe('loading state', () => {
    it('is not loading when no ML jobs are installed, so the query is switched off', () => {
      mockUseJobs.mockReturnValue({ jobIds: [], loading: false });
      mockUseQuery.mockReturnValue(switchedOffQuery);
      const { result } = renderHook(() => useEntitiesWithAnomaliesCount(opts));
      expect(result.current.isLoading).toBe(false);
      expect(result.current.count).toBe(0);
    });

    it('is loading while the jobs or the entities index are still loading', () => {
      mockUseJobs.mockReturnValue({ jobIds: [], loading: true });
      expect(renderHook(() => useEntitiesWithAnomaliesCount(opts)).result.current.isLoading).toBe(
        true
      );

      mockUseJobs.mockReturnValue({ jobIds: ['job_a'], loading: false });
      mockUseIndex.mockReturnValue({ data: undefined, isLoading: true });
      expect(renderHook(() => useEntitiesWithAnomaliesCount(opts)).result.current.isLoading).toBe(
        true
      );
    });

    it('is loading while the query runs for the first time or refetches', () => {
      mockUseQuery.mockReturnValue({
        ...switchedOffQuery,
        isInitialLoading: true,
        isFetching: true,
      });
      expect(renderHook(() => useEntitiesWithAnomaliesCount(opts)).result.current.isLoading).toBe(
        true
      );

      mockUseQuery.mockReturnValue({ ...loadedQuery, isFetching: true });
      expect(renderHook(() => useEntitiesWithAnomaliesCount(opts)).result.current.isLoading).toBe(
        true
      );
    });

    it('does not keep the delta loading when no ML jobs are installed', () => {
      mockUseJobs.mockReturnValue({ jobIds: [], loading: false });
      mockUseQuery.mockReturnValue(switchedOffQuery);
      const { result } = renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
      expect(result.current.isDeltaLoading).toBe(false);
    });
  });

  describe('trend', () => {
    it('returns the series values and its loading state', () => {
      mockUseTrailing.mockReturnValue({ values: [5, 6], isLoading: true });
      const { result } = renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
      expect(result.current.trend).toEqual([5, 6]);
      expect(result.current.isTrendLoading).toBe(true);
    });

    it('builds the trailing query for the selected range with the installed jobs', () => {
      renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
      const { query, timeRange, enabled } = lastTrailingArgs();
      expect(timeRange).toBe('7d');
      expect(enabled).toBe(true);
      expect(query).toContain('FROM .ml-anomalies-shared*');
      expect(query).toContain('job_id IN ("job_a")');
      expect(query.match(/COUNT_DISTINCT\(effective_id\)/g)).toHaveLength(28);
    });

    it('waits for the count and the delta before it starts', () => {
      mockUseQuery.mockReturnValue({ ...loadedQuery, isFetching: true });
      renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
      expect(lastTrailingArgs().enabled).toBe(false);
    });

    it('does not run without ML jobs, or when asked to skip', () => {
      mockUseJobs.mockReturnValue({ jobIds: [], loading: false });
      renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
      expect(lastTrailingArgs().enabled).toBe(false);

      mockUseJobs.mockReturnValue({ jobIds: ['job_a'], loading: false });
      renderHook(() => useEntitiesWithAnomaliesCountWithDelta({ ...opts, skip: true }));
      expect(lastTrailingArgs().enabled).toBe(false);
    });

    it('has no query until the entities index and the euid api are known', () => {
      mockUseIndex.mockReturnValue({ data: undefined, isLoading: false });
      renderHook(() => useEntitiesWithAnomaliesCountWithDelta(opts));
      expect(lastTrailingArgs().query).toBeNull();
    });
  });
});
