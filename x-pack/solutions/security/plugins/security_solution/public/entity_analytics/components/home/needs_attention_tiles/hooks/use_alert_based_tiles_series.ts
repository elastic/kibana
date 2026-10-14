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
import { getTileTrend, useTileSeriesQuery } from './use_tile_series_query';

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

  const { series, isFetching, isError } = useTileSeriesQuery({
    tileKey: 'alertBasedTilesSeries',
    query,
    enabled: !skip && isReady && !isIndexLoading,
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
  const alerts = getTileTrend({ ...state, dots: series?.severe, liveCount: severeAlertsCount });
  const watchlisted = getTileTrend({
    ...state,
    dots: series?.watchlisted,
    liveCount: watchlistedCount,
  });

  return {
    alertsTrend: alerts.trend,
    watchlistedTrend: watchlisted.trend,
    isTrendLoading: alerts.isTrendLoading,
  };
};
