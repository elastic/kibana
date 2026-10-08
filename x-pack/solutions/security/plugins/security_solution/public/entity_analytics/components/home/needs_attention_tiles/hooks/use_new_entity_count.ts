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
  buildNewEntityTrailingSeriesQuery,
  trailingNewEntityColumn,
} from '../queries/new_entity_trailing_series_query';
import { useTrailingTileSeries } from './use_trailing_tile_series';
import type { TimeRange } from '../../use_time_range_param';
import {
  getEntityFilterESQL,
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
} from '../../use_entity_filters_param';

const TIME_RANGE_TO_ESQL: Record<TimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

const DOUBLE_TIME_RANGE: Record<TimeRange, string> = {
  '24h': '48 hours',
  '7d': '14 days',
  '30d': '60 days',
};

interface NewEntityTileOpts {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
}

export const useNewEntityCount = ({
  spaceId,
  skip,
  timeRange = '7d',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: NewEntityTileOpts) => {
  const { data } = useKibana().services;
  const {
    data: resolvedIndex,
    isLoading: isIndexLoading,
    error: indexError,
  } = useResolvedLatestEntitiesIndexName(spaceId);

  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () =>
      index
        ? [
            `FROM ${index}`,
            `| WHERE entity.lifecycle.first_seen >= NOW() - ${TIME_RANGE_TO_ESQL[timeRange]} AND entity.risk.calculated_score > 0`,
            ...getEntityFilterESQL(entityFilters),
            `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
            `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
          ].join('\n')
        : null,
    [index, timeRange, entityFilters]
  );

  const isEnabled = !skip && !isIndexLoading && Boolean(index);

  const queryKey = useMemo(() => ['newEntityCount', query], [query]);

  const {
    data: result,
    isLoading,
    isFetching,
    error,
  } = useQuery(
    queryKey,
    async ({ signal }) => {
      if (!query) return { count: 0, entityIds: [] };
      const searchResult = await lastValueFrom(
        data.search.search(
          { params: { query } },
          {
            abortSignal: signal,
            strategy: 'esql_async',
            projectRouting: '_alias:_origin',
          }
        )
      );

      const rawResponse = searchResult.rawResponse as unknown as ESQLSearchResponse;
      const row = rawResponse.values?.[0];
      const valueIndex = rawResponse.columns?.findIndex((c) => c.name === 'value') ?? 0;
      const entityIdsIndex = rawResponse.columns?.findIndex((c) => c.name === 'entity_ids') ?? 1;
      const rawIds = row?.[entityIdsIndex];
      return {
        count: typeof row?.[valueIndex] === 'number' ? (row[valueIndex] as number) : 0,
        entityIds: Array.isArray(rawIds)
          ? (rawIds as string[]).filter(Boolean)
          : typeof rawIds === 'string' && rawIds
          ? [rawIds]
          : [],
      };
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      enabled: isEnabled,
      retry: 1,
    }
  );

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.newEntity.queryError', {
      defaultMessage: 'There was an error loading new entity data',
    }),
    (error as SecurityAppError | undefined) ?? indexError
  );

  return {
    count: result?.count ?? 0,
    entityIds: isFetching ? EMPTY_ENTITY_IDS : result?.entityIds ?? EMPTY_ENTITY_IDS,
    isLoading: isIndexLoading || isLoading || isFetching,
    error: (error as SecurityAppError | undefined) ?? indexError,
  };
};

const useNewEntityCountPrevPeriod = ({
  spaceId,
  skip,
  timeRange = '7d',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: NewEntityTileOpts) => {
  const { data } = useKibana().services;
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);

  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () =>
      index
        ? [
            `FROM ${index}`,
            `| WHERE entity.lifecycle.first_seen >= NOW() - ${DOUBLE_TIME_RANGE[timeRange]} AND entity.lifecycle.first_seen < NOW() - ${TIME_RANGE_TO_ESQL[timeRange]} AND entity.risk.calculated_score > 0`,
            ...getEntityFilterESQL(entityFilters),
            `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
            `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
          ].join('\n')
        : null,
    [index, timeRange, entityFilters]
  );

  const isEnabled = !skip && !isIndexLoading && Boolean(index);

  const {
    data: result,
    isLoading,
    isFetching,
  } = useQuery(
    ['newEntityCountPrevPeriod', query],
    async ({ signal }) => {
      if (!query) return { count: 0 };
      const searchResult = await lastValueFrom(
        data.search.search(
          { params: { query } },
          { abortSignal: signal, strategy: 'esql_async', projectRouting: '_alias:_origin' }
        )
      );
      const rawResponse = searchResult.rawResponse as unknown as ESQLSearchResponse;
      const row = rawResponse.values?.[0];
      const valueIndex = rawResponse.columns?.findIndex((c) => c.name === 'value') ?? 0;
      return {
        count: typeof row?.[valueIndex] === 'number' ? (row[valueIndex] as number) : 0,
      };
    },
    {
      keepPreviousData: true,
      staleTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      enabled: isEnabled,
      retry: 1,
    }
  );

  return {
    count: result?.count ?? 0,
    isLoading: isLoading || isFetching,
  };
};

/** Sparkline series: one dot per step (hourly for 24h, 6-hourly for 7d, daily for 30d), each the tile's count k steps ago. */
const useNewEntityTrend = ({
  spaceId,
  skip,
  timeRange = '7d',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: NewEntityTileOpts) => {
  const { data: resolvedIndex } = useResolvedLatestEntitiesIndexName(spaceId);
  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () =>
      index
        ? buildNewEntityTrailingSeriesQuery(index, timeRange, getEntityFilterESQL(entityFilters))
        : null,
    [index, timeRange, entityFilters]
  );

  return useTrailingTileSeries({
    tileKey: 'newEntity',
    query,
    timeRange,
    columnOf: trailingNewEntityColumn,
    enabled: !skip,
    localOnly: true,
    errorMessage: i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.newEntityTrend.queryError',
      {
        defaultMessage: 'There was an error loading the new entity trend',
      }
    ),
  });
};

/**
 * Delta variant — runs a lazily-started prev-period query after the main count resolves, and
 * the sparkline series once both the count and the delta have resolved.
 */
export const useNewEntityCountWithDelta = (opts: NewEntityTileOpts) => {
  const main = useNewEntityCount(opts);
  const prev = useNewEntityCountPrevPeriod({
    ...opts,
    skip: opts.skip || main.isLoading,
  });
  const trend = useNewEntityTrend({
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
