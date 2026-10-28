/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useTileQueryInputs } from './use_tile_query_inputs';
import type { EntityFilters, TimeRange } from '../../entities_grid/common';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import {
  anomaliesSeriesColumn,
  buildEntitiesWithAnomaliesSeriesQuery,
} from '../queries/entities_with_anomalies_series_query';
import { readSeriesDots } from '../queries/tile_series_window';
import { getSeriesGate, getTileTrend, useTileSeriesQuery } from './use_tile_series_query';

interface AnomaliesSeriesOptions {
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
  /** From the tile's delta hook (its `previous`): the delta's baseline, which starts the line. */
  deltaBaseline: number | undefined;
}

/**
 * The sparkline dots of the Entities with anomalies tile for the selected range, oldest first,
 * ending on the live count. Like the count it needs installed security ML jobs. While the series
 * runs the dots are undefined and `isTrendLoading` is true; if it fails or cannot run the dots stay
 * undefined and no spinner is shown, and the count and delta are untouched. Like the delta, it
 * runs only when the history reaches back twice the range and the count is above 0; otherwise there
 * is no line.
 */
export const useEntitiesWithAnomaliesSeries = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
  isReady,
  reachesBack,
  count,
  deltaBaseline,
}: AnomaliesSeriesOptions): { trend: number[] | undefined; isTrendLoading: boolean } => {
  const {
    data: resolvedIndex,
    isLoading: isIndexLoading,
    entityFilterClauses,
  } = useTileQueryInputs(spaceId, entityFilters);
  const { jobIds, loading: isJobsLoading } = useInstalledSecurityJobsIds();
  const index = resolvedIndex?.indexName;
  const isLoadingInputs = isIndexLoading || isJobsLoading;

  const query = useMemo(
    () =>
      index && jobIds.length > 0
        ? buildEntitiesWithAnomaliesSeriesQuery(index, timeRange, entityFilterClauses, jobIds)
        : null,
    [index, jobIds, timeRange, entityFilterClauses]
  );

  const { canRun, isHidden } = getSeriesGate({ isReady, reachesBack, count });
  const { series, isFetching, isError } = useTileSeriesQuery({
    tileKey: 'entitiesWithAnomaliesSeries',
    query,
    enabled: !skip && canRun && !isLoadingInputs,
    parse: (raw) => readSeriesDots(raw, timeRange, anomaliesSeriesColumn),
  });

  return getTileTrend({
    dots: series,
    liveCount: count,
    deltaBaseline,
    skip,
    isFetching,
    isError,
    isHidden,
    // Once the inputs have loaded, no installed job or no index means the query can never run.
    isUnavailable: !skip && !isLoadingInputs && !query,
  });
};
