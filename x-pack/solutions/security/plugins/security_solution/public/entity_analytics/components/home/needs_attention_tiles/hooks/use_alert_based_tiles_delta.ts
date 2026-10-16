/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { buildAlertBasedTilesQuery } from '../queries/entities_with_alerts_query';
import { buildAlertsHistoryReachesBackQuery } from '../queries/history_reaches_back';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import type { EntityFilters, TimeRange } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import { parseAlertBasedTilesResponse } from './use_entities_with_alerts_tiles';
import { isDeltaStillComing, usePreviousPeriod } from './use_previous_period';

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
}

/**
 * The deltas of the Entities with alerts and Watchlisted tiles, from one shared previous-period
 * query. It runs only once the page's counts have loaded and at least one of the two counts is above
 * 0, after a check that the alerts reach back twice the range. While a delta can still arrive
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
}: AlertBasedTilesDeltaOptions): {
  severeAlertsDelta: number | undefined;
  watchlistedDelta: number | undefined;
  isDeltaLoading: boolean;
  isHistoryMissing: boolean;
  /** True once the history check passed, so the sparkline can follow the same rule. */
  reachesBack: boolean | undefined;
} => {
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const index = resolvedIndex?.indexName;

  const guardQuery = buildAlertsHistoryReachesBackQuery(spaceId, timeRange);
  const previousQuery = useMemo(
    () =>
      index
        ? buildAlertBasedTilesQuery(
            index,
            spaceId,
            timeRange,
            buildEntityFilterClauses(entityFilters),
            'previous'
          )
        : null,
    [index, spaceId, timeRange, entityFilters]
  );

  const highestCount = Math.max(severeAlertsCount, watchlistedCount);
  const { previous, reachesBack, isHistoryMissing, isError } = usePreviousPeriod({
    tileKey: 'alertBasedTiles',
    guardQuery,
    previousQuery,
    enabled: !skip && isReady && highestCount > 0 && !isIndexLoading && Boolean(index),
    parse: parseAlertBasedTilesResponse,
  });

  return {
    severeAlertsDelta: previous ? severeAlertsCount - previous.severeAlertsCount : undefined,
    watchlistedDelta: previous ? watchlistedCount - previous.watchlistedCount : undefined,
    isHistoryMissing,
    reachesBack,
    isDeltaLoading: isDeltaStillComing({
      skip,
      count: highestCount,
      // Once the index has loaded, a missing one means the query can never run.
      isUnavailable: !skip && !isIndexLoading && !index,
      isError,
      isHistoryMissing,
      hasDelta: previous !== undefined,
    }),
  };
};
