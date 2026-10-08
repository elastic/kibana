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
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { EMPTY_ENTITY_IDS } from '../data';
import { buildEntitiesWithAnomaliesCountQuery } from '../queries/entities_with_anomalies_query';
import {
  buildEntityFilterClauses,
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
  type TimeRange,
} from '../../new_entities_table';

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
    error: indexError,
  } = useResolvedLatestEntitiesIndexName(spaceId);
  const { jobIds, loading: isJobsLoading } = useInstalledSecurityJobsIds();

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
      buildEntityFilterClauses(entityFilters),
      jobIds
    );
  }, [resolvedIndex?.indexName, timeRange, entityFilters, jobIds]);

  const {
    data: queryResult,
    isLoading,
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
    isLoading: isJobsLoading || isIndexLoading || isLoading || isFetching,
    error: filteredError ?? indexError,
  };
};
