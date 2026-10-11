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
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../common/lib/kibana';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { EMPTY_ENTITY_IDS } from '../data';
import {
  buildRiskMoversCountQuery,
  riskMoversWindow,
  riskMoversPrevWindow,
} from '../queries/tile_risk_movers_query';
import {
  buildRiskMoversTrailingSeriesQuery,
  trailingRiskMoversColumn,
} from '../queries/tile_risk_movers_trailing_series_query';
import { useTrailingTileSeries } from './use_trailing_tile_series';
import type { TimeRange } from '../../use_time_range_param';
import {
  getEntityFilterESQL,
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
} from '../../use_entity_filters_param';

interface RiskMoversTileOpts {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
}

export const useRiskMoversCount = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: RiskMoversTileOpts) => {
  const { data } = useKibana().services;
  const {
    data: resolvedIndex,
    isLoading: isIndexLoading,
    error: indexError,
  } = useResolvedLatestEntitiesIndexName(spaceId);

  const isEnabled = !skip && !isIndexLoading && Boolean(resolvedIndex?.indexName);

  const query = useMemo(
    () =>
      resolvedIndex?.indexName
        ? buildRiskMoversCountQuery(
            spaceId,
            resolvedIndex.indexName,
            riskMoversWindow(timeRange),
            getEntityFilterESQL(entityFilters)
          )
        : null,
    [spaceId, resolvedIndex?.indexName, timeRange, entityFilters]
  );

  const {
    data: queryResult,
    isInitialLoading,
    isFetching,
    error,
  } = useQuery<{ count: number; entityIds: string[] }, SecurityAppError>(
    ['riskMoversCount', query],
    async ({ signal }) => {
      if (!query) return { count: 0, entityIds: [] };
      const raw = await lastValueFrom(
        data.search.search({ params: { query } }, { abortSignal: signal, strategy: 'esql_async' })
      );
      const response = raw.rawResponse as unknown as ESQLSearchResponse;
      const row = response.values?.[0];
      const valueIndex = response.columns?.findIndex((c) => c.name === 'value') ?? 0;
      const entityIdsIndex = response.columns?.findIndex((c) => c.name === 'entity_ids') ?? -1;
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

  const isMissingIndex =
    (error as SecurityAppError | undefined)?.message?.includes('Unknown index') ?? false;
  const filteredError = isMissingIndex ? undefined : (error as SecurityAppError | undefined);

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.riskMovers.queryError', {
      defaultMessage: 'There was an error loading risk movers data',
    }),
    filteredError ?? indexError
  );

  return {
    count: queryResult?.count ?? 0,
    entityIds: isFetching ? EMPTY_ENTITY_IDS : queryResult?.entityIds ?? EMPTY_ENTITY_IDS,
    // isInitialLoading, not isLoading: a switched-off query reports isLoading forever in react-query v4.
    isLoading: isIndexLoading || isInitialLoading || isFetching,
    isMissingIndex,
    error: filteredError ?? indexError,
  };
};

const useRiskMoversCountPrevPeriod = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: RiskMoversTileOpts) => {
  const { data } = useKibana().services;
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);

  const isEnabled = !skip && !isIndexLoading && Boolean(resolvedIndex?.indexName);

  const query = useMemo(
    () =>
      resolvedIndex?.indexName
        ? buildRiskMoversCountQuery(
            spaceId,
            resolvedIndex.indexName,
            riskMoversPrevWindow(timeRange),
            getEntityFilterESQL(entityFilters)
          )
        : null,
    [spaceId, resolvedIndex?.indexName, timeRange, entityFilters]
  );

  const {
    data: queryResult,
    isInitialLoading,
    isFetching,
  } = useQuery<{ count: number }, SecurityAppError>(
    ['riskMoversCountPrevPeriod', query],
    async ({ signal }) => {
      if (!query) return { count: 0 };
      const raw = await lastValueFrom(
        data.search.search({ params: { query } }, { abortSignal: signal, strategy: 'esql_async' })
      );
      const response = raw.rawResponse as unknown as ESQLSearchResponse;
      const row = response.values?.[0];
      const valueIndex = response.columns?.findIndex((c) => c.name === 'value') ?? 0;
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
const useRiskMoversTrend = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: RiskMoversTileOpts) => {
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);

  const query = useMemo(
    () =>
      resolvedIndex?.indexName
        ? buildRiskMoversTrailingSeriesQuery(
            spaceId,
            resolvedIndex.indexName,
            timeRange,
            getEntityFilterESQL(entityFilters)
          )
        : null,
    [spaceId, resolvedIndex?.indexName, timeRange, entityFilters]
  );

  return useTrailingTileSeries({
    tileKey: 'riskMovers',
    query,
    timeRange,
    columnOf: trailingRiskMoversColumn,
    enabled: !skip && !isIndexLoading,
    errorMessage: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.riskMoversTrend.queryError',
      { defaultMessage: 'There was an error loading the risk movers trend' }
    ),
  });
};

/**
 * Delta variant — runs a lazily-started prev-period query after the main count resolves, and the
 * sparkline series once both the count and the delta have resolved.
 */
export const useRiskMoversCountWithDelta = (opts: RiskMoversTileOpts) => {
  const main = useRiskMoversCount(opts);
  const prev = useRiskMoversCountPrevPeriod({
    ...opts,
    skip: opts.skip || main.isLoading,
  });
  const trend = useRiskMoversTrend({
    ...opts,
    skip: opts.skip || main.isLoading || prev.isLoading || main.isMissingIndex,
  });
  return {
    ...main,
    delta: prev.isLoading ? undefined : main.count - prev.count,
    isDeltaLoading: prev.isLoading,
    trend: trend.values,
    isTrendLoading: trend.isLoading,
  };
};
