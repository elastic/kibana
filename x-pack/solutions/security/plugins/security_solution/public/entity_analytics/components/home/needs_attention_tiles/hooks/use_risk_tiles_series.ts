/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import type { EntityFilters, TimeRange } from '../../entities_grid/common';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import {
  buildRiskTilesSeriesQuery,
  newlyHighCriticalSeriesColumn,
  riskMoversSeriesColumn,
} from '../queries/risk_series_query';
import { readSeriesDots } from '../queries/tile_series_window';
import { getSeriesGate, getTileTrend, useTileSeriesQuery } from './use_tile_series_query';

interface RiskTilesSeriesOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** True once the counts and the deltas of both tiles have loaded; the series never delays them. */
  isReady: boolean;
  /** From each tile's delta hook: the series follows the same history rule. */
  riskMoversReachesBack: boolean | undefined;
  newlyHighCriticalReachesBack: boolean | undefined;
  /** The live counts, which replace the newest dot so each line ends on the number shown. */
  riskMoversCount: number;
  newlyHighCriticalCount: number;
}

/**
 * The sparkline dots of the Risk movers and Newly high/critical tiles for the selected range,
 * oldest first, each ending on the live count, from one query: the two tiles read the same risk
 * score history, so it is scanned once. Both ends of every dot come from that history. While the
 * query runs the dots are undefined and `isTrendLoading` is true; if it fails or cannot run the
 * dots stay undefined and no spinner is shown, and the counts and deltas are untouched. Like the
 * deltas, it runs only when a tile's history reaches back twice the range and its count is above 0,
 * and a tile that does not qualify has no line.
 */
export const useRiskTilesSeries = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
  isReady,
  riskMoversReachesBack,
  newlyHighCriticalReachesBack,
  riskMoversCount,
  newlyHighCriticalCount,
}: RiskTilesSeriesOptions): {
  riskMoversTrend: number[] | undefined;
  newlyHighCriticalTrend: number[] | undefined;
  isTrendLoading: boolean;
} => {
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () =>
      index
        ? buildRiskTilesSeriesQuery(
            spaceId,
            index,
            timeRange,
            buildEntityFilterClauses(entityFilters)
          )
        : null,
    [spaceId, index, timeRange, entityFilters]
  );

  const moversGate = getSeriesGate({
    isReady,
    reachesBack: riskMoversReachesBack,
    count: riskMoversCount,
  });
  const newlyHighGate = getSeriesGate({
    isReady,
    reachesBack: newlyHighCriticalReachesBack,
    count: newlyHighCriticalCount,
  });
  const { series, isFetching, isError } = useTileSeriesQuery({
    tileKey: 'riskTilesSeries',
    query,
    enabled: !skip && (moversGate.canRun || newlyHighGate.canRun) && !isIndexLoading,
    parse: (raw: ESQLSearchResponse) => ({
      riskMovers: readSeriesDots(raw, timeRange, riskMoversSeriesColumn),
      newlyHighCritical: readSeriesDots(raw, timeRange, newlyHighCriticalSeriesColumn),
    }),
  });

  const state = {
    skip,
    isFetching,
    isError,
    // Once the index has loaded, a missing one means the query can never run.
    isUnavailable: !skip && !isIndexLoading && !index,
  };
  const riskMovers = getTileTrend({
    ...state,
    dots: series?.riskMovers,
    liveCount: riskMoversCount,
    isHidden: moversGate.isHidden,
  });
  const newlyHighCritical = getTileTrend({
    ...state,
    dots: series?.newlyHighCritical,
    liveCount: newlyHighCriticalCount,
    isHidden: newlyHighGate.isHidden,
  });

  return {
    riskMoversTrend: riskMovers.trend,
    newlyHighCriticalTrend: newlyHighCritical.trend,
    isTrendLoading: riskMovers.isTrendLoading || newlyHighCritical.isTrendLoading,
  };
};
