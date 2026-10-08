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
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import {
  buildAlertBasedTilesTrailingSeriesQuery,
  trailingAlertsColumn,
  trailingWatchlistedColumn,
} from '../queries/entities_with_alerts_trailing_series_query';
import { TRAILING_WINDOW } from '../queries/tile_trailing_window';
import type { TimeRange } from '../../use_time_range_param';
import {
  getEntityFilterESQL,
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
} from '../../use_entity_filters_param';

export interface AlertBasedTilesTrend {
  /** Entities with alerts, one value per dot, oldest first; the last one is the tile's number. */
  alerts: number[];
  /** Watchlisted, one value per dot, oldest first; the last one is the tile's number. */
  watchlisted: number[];
}

/**
 * Reads the single result row into oldest-first dots. A missing or null column counts as 0, and
 * an empty response gives all zeros.
 */
export const parseAlertBasedTilesTrend = (
  raw: ESQLSearchResponse,
  timeRange: TimeRange
): AlertBasedTilesTrend => {
  const { dots } = TRAILING_WINDOW[timeRange];
  const row = raw.values?.[0];

  const dotValues = (columnOf: (k: number) => string): number[] =>
    Array.from({ length: dots }, (_, i) => {
      const k = dots - 1 - i;
      const index = raw.columns?.findIndex((c) => c.name === columnOf(k)) ?? -1;
      const value = index < 0 ? undefined : row?.[index];
      return typeof value === 'number' ? value : 0;
    });

  return {
    alerts: dotValues(trailingAlertsColumn),
    watchlisted: dotValues(trailingWatchlistedColumn),
  };
};

/**
 * Runs the trailing-window series query for the Entities with alerts and Watchlisted tiles.
 * It refreshes together with the tile count so the last dot matches the tile's number. A failing
 * query only shows an error toast; it never changes the tile's count.
 */
export const useAlertBasedTilesTrend = ({
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
  const euidApi = useEntityStoreEuidApi();
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);

  const isEnabled =
    !skip && !isIndexLoading && Boolean(euidApi) && Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!resolvedIndex?.indexName || !euidApi) return null;
    return buildAlertBasedTilesTrailingSeriesQuery(
      euidApi.euid,
      resolvedIndex.indexName,
      spaceId,
      timeRange,
      getEntityFilterESQL(entityFilters)
    );
  }, [euidApi, resolvedIndex?.indexName, spaceId, timeRange, entityFilters]);

  const {
    data: trend,
    isLoading,
    isFetching,
    error,
  } = useQuery<AlertBasedTilesTrend, SecurityAppError>(
    ['alertBasedTilesTrend', query, timeRange],
    async ({ signal }) => {
      if (!query) return parseAlertBasedTilesTrend({ columns: [], values: [] }, timeRange);
      const raw = await lastValueFrom(
        data.search.search({ params: { query } }, { abortSignal: signal, strategy: 'esql_async' })
      );
      return parseAlertBasedTilesTrend(raw.rawResponse as unknown as ESQLSearchResponse, timeRange);
    },
    {
      enabled: isEnabled && Boolean(query),
      keepPreviousData: true,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const filteredError = error?.message?.includes('Unknown index') ? undefined : error;

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.alertBasedTilesTrend.queryError', {
      defaultMessage: 'There was an error loading the entities with alerts trend',
    }),
    filteredError ?? undefined
  );

  return {
    alertsTrend: trend?.alerts,
    watchlistedTrend: trend?.watchlisted,
    isLoading: isEnabled && (isLoading || isFetching),
  };
};
