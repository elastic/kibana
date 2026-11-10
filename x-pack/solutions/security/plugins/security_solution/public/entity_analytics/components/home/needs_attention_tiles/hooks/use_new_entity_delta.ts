/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useTileQueryInputs } from './use_tile_query_inputs';
import { buildNewEntityHistoryReachesBackQuery } from '../queries/history_reaches_back';
import { buildNewEntityCountQuery } from '../queries/new_entity_query';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import type { EntityFilters, TimeRange } from '../../entities_grid/common';
import { readFirstNumber } from './read_first_number';
import { isDeltaStillComing, usePreviousPeriod } from './use_previous_period';
import type { TileDeltaFailure } from '../data';

interface NewEntityDeltaOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** True once all the page's counts have loaded; the deltas never delay a count. */
  isReady: boolean;
  /** The live count, which the previous period is compared with. */
  count: number;
  /** True when the count came back: a failed, timed-out or skipped count has no change to show. */
  hasCount: boolean;
}

/**
 * The delta of the New entity tile. It runs on the local cluster only, like the count, once the
 * page's counts have loaded and its own count came back, after a check that the entity store
 * reaches back twice the range (the oldest `first_seen`).
 */
export const useNewEntityDelta = ({
  spaceId,
  skip,
  timeRange = '7d',
  entityFilters = EMPTY_ENTITY_FILTERS,
  isReady,
  count,
  hasCount,
}: NewEntityDeltaOptions): {
  delta: number | undefined;
  /** The count over the previous period, which the sparkline starts from. */
  previous: number | undefined;
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

  const guardQuery = index ? buildNewEntityHistoryReachesBackQuery(index, timeRange) : null;
  const previousQuery = useMemo(
    () =>
      index ? buildNewEntityCountQuery(index, timeRange, entityFilterClauses, 'previous') : null,
    [index, timeRange, entityFilterClauses]
  );

  const { previous, reachesBack, isHistoryMissing, isError, failure } = usePreviousPeriod({
    tileKey: 'newEntity',
    guardQuery,
    previousQuery,
    enabled: !skip && isReady && hasCount && !isIndexLoading && Boolean(index),
    parse: (raw) => readFirstNumber(raw, 'value'),
  });

  return {
    delta: previous !== undefined ? count - previous : undefined,
    previous,
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
