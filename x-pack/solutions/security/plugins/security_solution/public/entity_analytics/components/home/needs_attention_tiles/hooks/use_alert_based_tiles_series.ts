/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ESQLSearchResponse } from '@kbn/es-types';
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
import { getSeriesGate, getTileTrend, useTileSeriesQuery } from './use_tile_series_query';

interface AlertBasedTilesSeriesOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** True once the count and its delta have loaded; the series never delays them. */
  isReady: boolean;
  /** From the alert tiles' delta hook: the series follows the same history rule. */
  reachesBack: boolean | undefined;
  /** The live counts, which replace the newest dot so the line ends on the number shown. */
  severeAlertsCount: number;
  watchlistedCount: number;
}

/**
 * The sparkline dots of the Entities with alerts and Watchlisted tiles for the selected range,
 * oldest first, each ending on the live count. The query starts once the counts and the delta have
 * loaded, only when the history reaches back twice the range and a count is above 0; a tile whose
 * count is 0, or whose history is too short, has no line (like its delta). While it runs the dots
 * are undefined and `isTrendLoading` is true; if it fails the dots stay undefined and no spinner is
 * shown, and the count and delta are untouched.
 */
export const useAlertBasedTilesSeries = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
  isReady,
  reachesBack,
  severeAlertsCount,
  watchlistedCount,
}: AlertBasedTilesSeriesOptions): {
  alertsTrend: number[] | undefined;
  watchlistedTrend: number[] | undefined;
  isTrendLoading: boolean;
} => {
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

  const severeGate = getSeriesGate({ isReady, reachesBack, count: severeAlertsCount });
  const watchlistedGate = getSeriesGate({ isReady, reachesBack, count: watchlistedCount });
  const { series, isFetching, isError } = useTileSeriesQuery({
    tileKey: 'alertBasedTilesSeries',
    query,
    enabled: !skip && (severeGate.canRun || watchlistedGate.canRun) && !isIndexLoading,
    parse: (raw: ESQLSearchResponse) => ({
      severe: readSeriesDots(raw, timeRange, severeAlertsSeriesColumn),
      watchlisted: readSeriesDots(raw, timeRange, watchlistedSeriesColumn),
    }),
  });

  const state = {
    skip,
    isFetching,
    isError,
    // Once the index has loaded, a missing one means the query can never run.
    isUnavailable: !skip && !isIndexLoading && !index,
  };
  const alerts = getTileTrend({
    ...state,
    dots: series?.severe,
    liveCount: severeAlertsCount,
    isHidden: severeGate.isHidden,
  });
  const watchlisted = getTileTrend({
    ...state,
    dots: series?.watchlisted,
    liveCount: watchlistedCount,
    isHidden: watchlistedGate.isHidden,
  });

  return {
    alertsTrend: alerts.trend,
    watchlistedTrend: watchlisted.trend,
    isTrendLoading: alerts.isTrendLoading || watchlisted.isTrendLoading,
  };
};
