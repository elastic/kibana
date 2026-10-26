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
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useKibana } from '../../../../../common/lib/kibana';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useTileQueryInputs } from './use_tile_query_inputs';
import { EMPTY_ENTITY_IDS } from '../data';
import { buildEntitiesWithAnomaliesCountQuery } from '../queries/entities_with_anomalies_query';
import {
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
  type TimeRange,
} from '../../entities_grid/common';
import { TILE_QUERY_CACHE_OPTIONS } from './tile_query_cache';
import { isTileQueryTimeout, retryUnlessTimedOut, runWithTileTimeout } from './tile_query_timeout';

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

export const useEntitiesWithAnomaliesCount = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
}) => {
  const { data } = useKibana().services;
  const {
    data: resolvedIndex,
    isLoading: isIndexLoading,
    entityFilterClauses,
    error: indexError,
  } = useTileQueryInputs(spaceId, entityFilters);
  const {
    jobIds,
    loading: isJobsLoading,
    isMlUser,
    isLicensed,
    isError: isJobsError,
  } = useInstalledSecurityJobsIds();

  const isEnabled =
    !skip &&
    !isIndexLoading &&
    !isJobsLoading &&
    jobIds.length > 0 &&
    Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!resolvedIndex?.indexName) return null;
    return buildEntitiesWithAnomaliesCountQuery(
      resolvedIndex.indexName,
      timeRange,
      entityFilterClauses,
      jobIds
    );
  }, [resolvedIndex?.indexName, timeRange, entityFilterClauses, jobIds]);

  const {
    data: queryResult,
    isInitialLoading: isLoading,
    isFetching,
    error,
  } = useQuery<{ count: number; entityIds: string[] }, SecurityAppError>(
    ['entitiesWithAnomaliesCount', query],
    async ({ signal }) => {
      if (!query) return { count: 0, entityIds: [] };
      const raw = await runWithTileTimeout(signal, (tileSignal) =>
        esqlSearch(data.search, query, tileSignal)
      );
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
      ...TILE_QUERY_CACHE_OPTIONS,
      refetchOnWindowFocus: false,
      retry: retryUnlessTimedOut,
    }
  );

  const filteredError = (error as SecurityAppError | undefined)?.message?.includes('Unknown index')
    ? undefined
    : (error as SecurityAppError | undefined);

  // The inputs can time out too (the group filter overrides). Either way the tile says so, and a
  // timed-out refetch does not leave the last count on show as if it were current.
  const isTimedOut = isTileQueryTimeout(error) || isTileQueryTimeout(indexError);
  const shownResult = isTimedOut ? undefined : queryResult;

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.entitiesWithAnomalies.queryError', {
      defaultMessage: 'There was an error loading entities with anomalies count',
    }),
    // A timeout gets one notice for the whole page, and a message on the tile, not a toast per tile.
    isTimedOut ? undefined : filteredError ?? indexError
  );

  return {
    count: shownResult?.count ?? 0,
    entityIds: isFetching ? EMPTY_ENTITY_IDS : shownResult?.entityIds ?? EMPTY_ENTITY_IDS,
    // A query that can never run (skipped, no index, no job) is not loading: react-query reports a
    // disabled query with no data as loading for ever.
    isLoading:
      isJobsLoading || isIndexLoading || (isEnabled && Boolean(query) && (isLoading || isFetching)),
    // True while the count is on its way, not when its query can never run (skipped, no index, no job).
    isCountPending:
      isJobsLoading || isIndexLoading || (isEnabled && Boolean(query) && (isLoading || isFetching)),
    /**
     * No security ML job is installed, so the tile has nothing to count. Not when the jobs could not
     * be asked for (no ML permission or licence, or the ML capabilities are still loading) or their
     * fetch failed: then the list is empty too.
     */
    isMissingJobs: isMlUser && isLicensed && !isJobsError && !isJobsLoading && jobIds.length === 0,
    error: filteredError ?? indexError,
    isTimedOut,
  };
};
