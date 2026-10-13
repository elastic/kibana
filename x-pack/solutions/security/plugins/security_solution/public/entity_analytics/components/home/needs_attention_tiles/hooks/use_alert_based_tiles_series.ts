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
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import type { TimeRange, EntityFilters } from '../../entities_grid/common';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import {
  buildAlertBasedTilesSeriesQuery,
  severeAlertsSeriesColumn,
  watchlistedSeriesColumn,
} from '../queries/entities_with_alerts_series_query';
import { readSeriesDots } from '../queries/tile_series_window';

interface AlertBasedTilesSeriesOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** True once the count and its delta have loaded; the series never delays them. */
  isReady: boolean;
  /** The live counts, which replace the newest dot so the line ends on the number shown. */
  severeAlertsCount: number;
  watchlistedCount: number;
}

interface AlertBasedTilesSeries {
  severe: number[];
  watchlisted: number[];
}

/** The series moves by one dot per step, so a result is kept for an hour. */
const SERIES_STALE_TIME_MS = 60 * 60_000;

const withLiveCount = (dots: number[], liveCount: number): number[] => [
  ...dots.slice(0, -1),
  liveCount,
];

/**
 * The sparkline dots of the Entities with alerts and Watchlisted tiles for the selected range,
 * oldest first, each ending on the live count. The query starts once the count and the delta have
 * loaded. While it runs the dots are undefined and `isTrendLoading` is true; if it fails the dots
 * stay undefined and no spinner is shown, and the count and delta are untouched.
 */
export const useAlertBasedTilesSeries = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
  isReady,
  severeAlertsCount,
  watchlistedCount,
}: AlertBasedTilesSeriesOptions): {
  alertsTrend: number[] | undefined;
  watchlistedTrend: number[] | undefined;
  isTrendLoading: boolean;
} => {
  const { data } = useKibana().services;
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () =>
      index
        ? buildAlertBasedTilesSeriesQuery(
            index,
            spaceId,
            timeRange,
            buildEntityFilterClauses(entityFilters)
          )
        : null,
    [index, spaceId, timeRange, entityFilters]
  );

  const {
    data: series,
    isFetching,
    isError,
  } = useQuery<AlertBasedTilesSeries | undefined, SecurityAppError>(
    ['alertBasedTilesSeries', query],
    async ({ signal }) => {
      if (!query) return undefined;
      const result = await lastValueFrom(
        data.search.search({ params: { query } }, { abortSignal: signal, strategy: 'esql_async' })
      );
      const raw = result.rawResponse as unknown as ESQLSearchResponse;
      return {
        severe: readSeriesDots(raw, timeRange, severeAlertsSeriesColumn),
        watchlisted: readSeriesDots(raw, timeRange, watchlistedSeriesColumn),
      };
    },
    {
      enabled: !skip && isReady && !isIndexLoading && Boolean(query),
      keepPreviousData: true,
      staleTime: SERIES_STALE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const hasSeries = series !== undefined && !isFetching;
  // Once the index has loaded, a missing one means the query can never run.
  const isUnavailable = !skip && !isIndexLoading && !index;

  return {
    alertsTrend: hasSeries ? withLiveCount(series.severe, severeAlertsCount) : undefined,
    watchlistedTrend: hasSeries ? withLiveCount(series.watchlisted, watchlistedCount) : undefined,
    isTrendLoading: !skip && !hasSeries && !isError && !isUnavailable,
  };
};
