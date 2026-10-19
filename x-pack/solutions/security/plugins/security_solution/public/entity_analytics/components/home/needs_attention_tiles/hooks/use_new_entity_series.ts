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
import { getEntityFilterESQL } from '../../use_entity_filters_param';
import {
  buildNewEntitySeriesQuery,
  newEntitySeriesColumn,
} from '../queries/new_entity_series_query';
import { readSeriesDots } from '../queries/tile_series_window';
import { getSeriesGate, getTileTrend, useTileSeriesQuery } from './use_tile_series_query';

interface NewEntitySeriesOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** True once the count and its delta have loaded; the series never delays them. */
  isReady: boolean;
  /** From the tile's delta hook: the series follows the same history rule. */
  reachesBack: boolean | undefined;
  /** The live count, which replaces the newest dot so the line ends on the number shown. */
  count: number;
}

/**
 * The sparkline dots of the New entity tile for the selected range, oldest first, ending on the
 * live count. Like the count it runs on the local cluster only. While the series runs the dots
 * are undefined and `isTrendLoading` is true; if it fails or cannot run the dots stay undefined
 * and no spinner is shown, and the count and delta are untouched. Like the delta, it runs only when
 * the history reaches back twice the range and the count is above 0; otherwise there is no line.
 */
export const useNewEntitySeries = ({
  spaceId,
  skip,
  timeRange = '7d',
  entityFilters = EMPTY_ENTITY_FILTERS,
  isReady,
  reachesBack,
  count,
}: NewEntitySeriesOptions): { trend: number[] | undefined; isTrendLoading: boolean } => {
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () =>
      index
        ? buildNewEntitySeriesQuery(index, timeRange, getEntityFilterESQL(entityFilters))
        : null,
    [index, timeRange, entityFilters]
  );

  const { canRun, isHidden } = getSeriesGate({ isReady, reachesBack, count });
  const { series, isFetching, isError } = useTileSeriesQuery({
    tileKey: 'newEntitySeries',
    query,
    enabled: !skip && canRun && !isIndexLoading,
    parse: (raw) => readSeriesDots(raw, timeRange, newEntitySeriesColumn),
    localOnly: true,
  });

  return getTileTrend({
    dots: series,
    liveCount: count,
    skip,
    isFetching,
    isError,
    isHidden,
    // Once the index has loaded, a missing one means the query can never run.
    isUnavailable: !skip && !isIndexLoading && !index,
  });
};
