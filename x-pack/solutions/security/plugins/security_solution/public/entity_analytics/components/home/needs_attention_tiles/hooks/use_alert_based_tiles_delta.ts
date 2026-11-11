/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useTileQueryInputs } from './use_tile_query_inputs';
import { buildAlertBasedTilesQuery } from '../queries/entities_with_alerts_query';
import { buildAlertsHistoryReachesBackQuery } from '../queries/history_reaches_back';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import type { EntityFilters, TimeRange } from '../../entities_grid/common';
import { parseAlertBasedTilesResponse } from './use_entities_with_alerts_tiles';
import { isDeltaStillComing, usePreviousPeriod } from './use_previous_period';
import type { TileDeltaFailure } from '../data';

interface AlertBasedTilesDeltaOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** True once all the page's counts have loaded; the deltas never delay a count. */
  isReady: boolean;
  /** The live counts, which the previous period is compared with. */
  severeAlertsCount: number;
  watchlistedCount: number;
  /** True when the count came back: a failed, timed-out or skipped count has no change to show. */
  hasCount: boolean;
}

/**
 * The deltas of the Entities with alerts and Watchlisted tiles, from one shared previous-period
 * query. It runs only once the page's counts have loaded and came back, after a check that the alerts reach back twice the range. While a delta can still arrive
 * `isDeltaLoading` is true; after a failure or a short history it is false (a short history sets
 * `isHistoryMissing` instead).
 */
export const useAlertBasedTilesDelta = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
  isReady,
  severeAlertsCount,
  watchlistedCount,
  hasCount,
}: AlertBasedTilesDeltaOptions): {
  severeAlertsDelta: number | undefined;
  watchlistedDelta: number | undefined;
  /** The counts over the previous period, which the sparklines start from. */
  severeAlertsPrevious: number | undefined;
  watchlistedPrevious: number | undefined;
  isDeltaLoading: boolean;
  isHistoryMissing: boolean;
  /** True once the history check passed, so the sparkline can follow the same rule. */
  reachesBack: boolean | undefined;
  /** Set when the history check or the previous-period query failed. */
  failure: TileDeltaFailure | undefined;
} => {
  const {
    data: resolvedIndex,
    isLoading: isIndexLoading,
    entityFilterClauses,
  } = useTileQueryInputs(spaceId, entityFilters);
  const index = resolvedIndex?.indexName;

  const guardQuery = buildAlertsHistoryReachesBackQuery(spaceId, timeRange);
  const previousQuery = useMemo(
    () =>
      index
        ? buildAlertBasedTilesQuery(index, spaceId, timeRange, entityFilterClauses, 'previous')
        : null,
    [index, spaceId, timeRange, entityFilterClauses]
  );

  const { previous, reachesBack, isHistoryMissing, isError, failure } = usePreviousPeriod({
    tileKey: 'alertBasedTiles',
    guardQuery,
    previousQuery,
    enabled: !skip && isReady && hasCount && !isIndexLoading && Boolean(index),
    parse: parseAlertBasedTilesResponse,
  });

  return {
    severeAlertsDelta: previous ? severeAlertsCount - previous.severeAlertsCount : undefined,
    watchlistedDelta: previous ? watchlistedCount - previous.watchlistedCount : undefined,
    severeAlertsPrevious: previous?.severeAlertsCount,
    watchlistedPrevious: previous?.watchlistedCount,
    isHistoryMissing,
    reachesBack,
    failure,
    isDeltaLoading: isDeltaStillComing({
      skip,
      hasCount,
      // Once the index has loaded, a missing one means the query can never run.
      isUnavailable: !skip && !isIndexLoading && !index,
      isError,
      isHistoryMissing,
      hasDelta: previous !== undefined,
    }),
  };
};
