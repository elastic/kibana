/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useKibana } from '../../../../../common/lib/kibana';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { EMPTY_ENTITY_IDS } from '../data';
import {
  buildEntitiesWithAnomaliesCountQuery,
  anomaliesWindow,
  anomaliesPrevWindow,
} from '../queries/entities_with_anomalies_query';
import {
  buildEntitiesWithAnomaliesTrailingSeriesQuery,
  trailingAnomaliesColumn,
} from '../queries/entities_with_anomalies_trailing_series_query';
import { useTrailingTileSeries } from './use_trailing_tile_series';
import type { TimeRange } from '../../use_time_range_param';
import {
  getEntityFilterESQL,
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
} from '../../use_entity_filters_param';

const esqlSearch = async (
  searchService: ReturnType<typeof useKibana>['services']['data']['search'],
  query: string,
  signal: AbortSignal | undefined
): Promise<ESQLSearchResponse> => {
  const result = await lastValueFrom(
    searchService.search({ params: { query } }, { abortSignal: signal, strategy: 'esql_async' })
  );
  return result.rawResponse as unknown as ESQLSearchResponse;
};

interface AnomaliesTileOpts {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
}

export const useEntitiesWithAnomaliesCount = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: AnomaliesTileOpts) => {
  const { data } = useKibana().services;
  const euidApi = useEntityStoreEuidApi();
  const {
    data: resolvedIndex,
    isLoading: isIndexLoading,
    error: indexError,
  } = useResolvedLatestEntitiesIndexName(spaceId);
  const { jobIds, loading: isJobsLoading } = useInstalledSecurityJobsIds();

  const isEnabled =
    !skip &&
    !isIndexLoading &&
    !isJobsLoading &&
    jobIds.length > 0 &&
    Boolean(euidApi) &&
    Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!euidApi || !resolvedIndex?.indexName) return null;
    return buildEntitiesWithAnomaliesCountQuery(
      euidApi.euid,
      resolvedIndex.indexName,
      anomaliesWindow(timeRange),
      getEntityFilterESQL(entityFilters),
      jobIds
    );
  }, [euidApi, resolvedIndex?.indexName, timeRange, entityFilters, jobIds]);

  const {
    data: queryResult,
    isInitialLoading,
    isFetching,
    error,
  } = useQuery<{ count: number; entityIds: string[] }, SecurityAppError>(
    ['entitiesWithAnomaliesCount', query],
    async ({ signal }) => {
      if (!query) return { count: 0, entityIds: [] };
      const raw = await esqlSearch(data.search, query, signal);
      const row = raw.values?.[0];
      const valueIndex = raw.columns?.findIndex((c) => c.name === 'value') ?? 0;
      const entityIdsIndex = raw.columns?.findIndex((c) => c.name === 'entity_ids') ?? -1;
      const count = typeof row?.[valueIndex] === 'number' ? (row[valueIndex] as number) : 0;
      const rawIds = entityIdsIndex >= 0 ? row?.[entityIdsIndex] : undefined;
      const entityIds: string[] = Array.isArray(rawIds)
        ? (rawIds as string[]).filter(Boolean)
        : typeof rawIds === 'string' && rawIds
        ? [rawIds]
        : [];
      return { count, entityIds };
    },
    {
      enabled: isEnabled && Boolean(query),
      keepPreviousData: true,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const filteredError = (error as SecurityAppError | undefined)?.message?.includes('Unknown index')
    ? undefined
    : (error as SecurityAppError | undefined);

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.entitiesWithAnomalies.queryError', {
      defaultMessage: 'There was an error loading entities with anomalies count',
    }),
    filteredError ?? indexError
  );

  return {
    count: queryResult?.count ?? 0,
    entityIds: isFetching ? EMPTY_ENTITY_IDS : queryResult?.entityIds ?? EMPTY_ENTITY_IDS,
    // isInitialLoading, not isLoading: a switched-off query (no ML jobs installed) reports isLoading
    // forever in react-query v4, which kept the tile on its spinner.
    isLoading: isJobsLoading || isIndexLoading || isInitialLoading || isFetching,
    error: filteredError ?? indexError,
  };
};

const useEntitiesWithAnomaliesCountPrevPeriod = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: AnomaliesTileOpts) => {
  const { data } = useKibana().services;
  const euidApi = useEntityStoreEuidApi();
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const { jobIds, loading: isJobsLoading } = useInstalledSecurityJobsIds();

  const isEnabled =
    !skip &&
    !isIndexLoading &&
    !isJobsLoading &&
    jobIds.length > 0 &&
    Boolean(euidApi) &&
    Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!euidApi || !resolvedIndex?.indexName) return null;
    return buildEntitiesWithAnomaliesCountQuery(
      euidApi.euid,
      resolvedIndex.indexName,
      anomaliesPrevWindow(timeRange),
      getEntityFilterESQL(entityFilters),
      jobIds
    );
  }, [euidApi, resolvedIndex?.indexName, timeRange, entityFilters, jobIds]);

  const {
    data: queryResult,
    isInitialLoading,
    isFetching,
  } = useQuery<{ count: number }, SecurityAppError>(
    ['entitiesWithAnomaliesCountPrevPeriod', query],
    async ({ signal }) => {
      if (!query) return { count: 0 };
      const raw = await esqlSearch(data.search, query, signal);
      const row = raw.values?.[0];
      const valueIndex = raw.columns?.findIndex((c) => c.name === 'value') ?? 0;
      const count = typeof row?.[valueIndex] === 'number' ? (row[valueIndex] as number) : 0;
      return { count };
    },
    {
      enabled: isEnabled && Boolean(query),
      keepPreviousData: true,
      staleTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  return {
    count: queryResult?.count ?? 0,
    isLoading: isInitialLoading || isFetching,
  };
};

/** Sparkline series: one dot per step (hourly for 24h, 6-hourly for 7d, daily for 30d), each the tile's count k steps ago. */
const useEntitiesWithAnomaliesTrend = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: AnomaliesTileOpts) => {
  const euidApi = useEntityStoreEuidApi();
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const { jobIds, loading: isJobsLoading } = useInstalledSecurityJobsIds();

  const query = useMemo(() => {
    if (!euidApi || !resolvedIndex?.indexName) return null;
    return buildEntitiesWithAnomaliesTrailingSeriesQuery(
      euidApi.euid,
      resolvedIndex.indexName,
      timeRange,
      getEntityFilterESQL(entityFilters),
      jobIds
    );
  }, [euidApi, resolvedIndex?.indexName, timeRange, entityFilters, jobIds]);

  return useTrailingTileSeries({
    tileKey: 'entitiesWithAnomalies',
    query,
    timeRange,
    columnOf: trailingAnomaliesColumn,
    enabled: !skip && !isIndexLoading && !isJobsLoading && jobIds.length > 0,
    errorMessage: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.entitiesWithAnomaliesTrend.queryError',
      { defaultMessage: 'There was an error loading the entities with anomalies trend' }
    ),
  });
};

/**
 * Delta variant — runs a lazily-started prev-period query after the main count resolves, and the
 * sparkline series once both the count and the delta have resolved.
 */
export const useEntitiesWithAnomaliesCountWithDelta = (opts: AnomaliesTileOpts) => {
  const main = useEntitiesWithAnomaliesCount(opts);
  const prev = useEntitiesWithAnomaliesCountPrevPeriod({
    ...opts,
    skip: opts.skip || main.isLoading,
  });
  const trend = useEntitiesWithAnomaliesTrend({
    ...opts,
    skip: opts.skip || main.isLoading || prev.isLoading,
  });
  return {
    ...main,
    delta: prev.isLoading ? undefined : main.count - prev.count,
    isDeltaLoading: prev.isLoading,
    trend: trend.values,
    isTrendLoading: trend.isLoading,
  };
};
