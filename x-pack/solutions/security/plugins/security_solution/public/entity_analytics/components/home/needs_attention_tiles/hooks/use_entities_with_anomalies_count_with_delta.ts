/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useKibana } from '../../../../../common/lib/kibana';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { buildEntitiesWithAnomaliesCountQuery } from '../queries/entities_with_anomalies_query';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import { useEntitiesWithAnomaliesCount } from './use_entities_with_anomalies_count';

type AnomaliesCountOptions = Parameters<typeof useEntitiesWithAnomaliesCount>[0];

/** The previous period barely changes between renders, so it stays fresh longer than the count. */
const PREVIOUS_PERIOD_STALE_TIME_MS = 30 * 60_000;

/**
 * Runs the entities with anomalies query for the previous period, the same query and rules as the
 * count with the window moved back one range. A failing query only leaves the delta empty.
 */
const usePreviousPeriodAnomaliesCount = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: AnomaliesCountOptions) => {
  const { data } = useKibana().services;
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
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
      jobIds,
      'previous'
    );
  }, [resolvedIndex?.indexName, timeRange, entityFilters, jobIds]);

  const {
    data: previous,
    isFetching,
    isError,
  } = useQuery<number | undefined, SecurityAppError>(
    ['entitiesWithAnomaliesCountPrevPeriod', query],
    async ({ signal }) => {
      if (!query) return undefined;
      const result = await lastValueFrom(
        data.search.search({ params: { query } }, { abortSignal: signal, strategy: 'esql_async' })
      );
      const raw = result.rawResponse as unknown as ESQLSearchResponse;
      const valueIndex = raw.columns?.findIndex((c) => c.name === 'value') ?? 0;
      const value = raw.values?.[0]?.[valueIndex];
      return typeof value === 'number' ? value : 0;
    },
    {
      enabled: isEnabled && Boolean(query),
      keepPreviousData: true,
      staleTime: PREVIOUS_PERIOD_STALE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  return { previous, isFetching, isError };
};

/**
 * The Entities with anomalies tile with its period-over-period delta. The previous-period query
 * starts once the count has loaded, so the delta never delays the count. While it runs the delta
 * is undefined and `isDeltaLoading` is true; if it fails the delta stays undefined and no spinner
 * is shown.
 */
export const useEntitiesWithAnomaliesCountWithDelta = (opts: AnomaliesCountOptions) => {
  const main = useEntitiesWithAnomaliesCount(opts);
  const { previous, isFetching, isError } = usePreviousPeriodAnomaliesCount({
    ...opts,
    skip: opts.skip || main.isLoading,
  });

  const hasPrevious = previous !== undefined && !isFetching;

  return {
    ...main,
    delta: hasPrevious ? main.count - previous : undefined,
    isDeltaLoading: !opts.skip && !hasPrevious && !isError,
  };
};
