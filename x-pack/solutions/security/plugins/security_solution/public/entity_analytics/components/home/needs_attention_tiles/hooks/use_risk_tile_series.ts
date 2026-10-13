/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import type { EntityFilters, TimeRange } from '../../entities_grid/common';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import {
  buildNewlyHighCriticalSeriesQuery,
  buildRiskMoversSeriesQuery,
  newlyHighCriticalSeriesColumn,
  riskMoversSeriesColumn,
} from '../queries/risk_series_query';
import { readSeriesDots } from '../queries/tile_series_window';
import { getTileTrend, useTileSeriesQuery } from './use_tile_series_query';

interface RiskTileSeriesOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** True once the count and its delta have loaded; the series never delays them. */
  isReady: boolean;
  /** The live count, which replaces the newest dot so the line ends on the number shown. */
  count: number;
}

interface RiskTileSeriesDefinition {
  tileKey: string;
  build: (
    spaceId: string,
    entitiesIndexName: string,
    timeRange: TimeRange,
    entityFilterClauses: string[]
  ) => string;
  column: (k: number) => string;
}

const useRiskTileSeries = (
  { tileKey, build, column }: RiskTileSeriesDefinition,
  {
    spaceId,
    skip,
    timeRange = '24h',
    entityFilters = EMPTY_ENTITY_FILTERS,
    isReady,
    count,
  }: RiskTileSeriesOptions
): { trend: number[] | undefined; isTrendLoading: boolean } => {
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () =>
      index ? build(spaceId, index, timeRange, buildEntityFilterClauses(entityFilters)) : null,
    [build, spaceId, index, timeRange, entityFilters]
  );

  const { series, isFetching, isError } = useTileSeriesQuery({
    tileKey,
    query,
    enabled: !skip && isReady && !isIndexLoading,
    parse: (raw) => readSeriesDots(raw, timeRange, column),
  });

  return getTileTrend({
    dots: series,
    liveCount: count,
    skip,
    isFetching,
    isError,
    // Once the index has loaded, a missing one means the query can never run.
    isUnavailable: !skip && !isIndexLoading && !index,
  });
};

const RISK_MOVERS_SERIES: RiskTileSeriesDefinition = {
  tileKey: 'riskMoversSeries',
  build: buildRiskMoversSeriesQuery,
  column: riskMoversSeriesColumn,
};

const NEWLY_HIGH_CRITICAL_SERIES: RiskTileSeriesDefinition = {
  tileKey: 'newlyHighCriticalSeries',
  build: buildNewlyHighCriticalSeriesQuery,
  column: newlyHighCriticalSeriesColumn,
};

/**
 * The sparkline dots of the Risk movers tile for the selected range, oldest first, ending on the
 * live count. Both ends of every dot come from the risk score history. While the series runs the
 * dots are undefined and `isTrendLoading` is true; if it fails or cannot run the dots stay
 * undefined and no spinner is shown, and the count and delta are untouched.
 */
export const useRiskMoversSeries = (options: RiskTileSeriesOptions) =>
  useRiskTileSeries(RISK_MOVERS_SERIES, options);

/** The same for the Newly high/critical tile. */
export const useNewlyHighCriticalSeries = (options: RiskTileSeriesOptions) =>
  useRiskTileSeries(NEWLY_HIGH_CRITICAL_SERIES, options);
