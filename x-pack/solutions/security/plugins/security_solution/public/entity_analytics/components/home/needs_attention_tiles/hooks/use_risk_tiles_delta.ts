/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import type { EntityFilters, TimeRange } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import { buildRiskHistoryReachesBackQuery } from '../queries/risk_previous_period';
import { buildNewlyHighCriticalCountQuery } from '../queries/tile_newly_high_critical_query';
import { buildRiskMoversCountQuery } from '../queries/tile_risk_movers_query';
import { readFirstNumber } from './read_first_number';
import { isDeltaStillComing, usePreviousPeriod } from './use_previous_period';

interface RiskTileDeltaOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** True once all the page's counts have loaded; the deltas never delay a count. */
  isReady: boolean;
  /** The live count, which the previous period is compared with. */
  count: number;
}

interface RiskTileDefinition {
  tileKey: string;
  buildPrevious: (
    spaceId: string,
    entitiesIndexName: string,
    timeRange: TimeRange,
    entityFilterClauses: string[]
  ) => string;
}

const RISK_HISTORY_GUARD_KEY = 'riskHistory';

const useRiskTileDelta = (
  { tileKey, buildPrevious }: RiskTileDefinition,
  {
    spaceId,
    skip,
    timeRange = '24h',
    entityFilters = EMPTY_ENTITY_FILTERS,
    isReady,
    count,
  }: RiskTileDeltaOptions
): {
  delta: number | undefined;
  isDeltaLoading: boolean;
  isHistoryMissing: boolean;
  reachesBack: boolean | undefined;
} => {
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const index = resolvedIndex?.indexName;

  const guardQuery = buildRiskHistoryReachesBackQuery(spaceId, timeRange);
  const previousQuery = useMemo(
    () =>
      index
        ? buildPrevious(spaceId, index, timeRange, buildEntityFilterClauses(entityFilters))
        : null,
    [buildPrevious, spaceId, index, timeRange, entityFilters]
  );

  const { previous, reachesBack, isHistoryMissing, isError } = usePreviousPeriod({
    tileKey,
    // Both risk tiles read the same history with the same query: one request.
    guardKey: RISK_HISTORY_GUARD_KEY,
    guardQuery,
    previousQuery,
    enabled: !skip && isReady && count > 0 && !isIndexLoading && Boolean(index),
    parse: (raw) => readFirstNumber(raw, 'value'),
  });

  return {
    delta: previous !== undefined ? count - previous : undefined,
    isHistoryMissing,
    reachesBack,
    isDeltaLoading: isDeltaStillComing({
      skip,
      count,
      // Once the index has loaded, a missing one means the query can never run.
      isUnavailable: !skip && !isIndexLoading && !index,
      isError,
      isHistoryMissing,
      hasDelta: previous !== undefined,
    }),
  };
};

const RISK_MOVERS: RiskTileDefinition = {
  tileKey: 'riskMovers',
  buildPrevious: (spaceId, index, timeRange, filters) =>
    buildRiskMoversCountQuery(spaceId, index, timeRange, filters, 'previous'),
};

const NEWLY_HIGH_CRITICAL: RiskTileDefinition = {
  tileKey: 'newlyHighCritical',
  buildPrevious: (spaceId, index, timeRange, filters) =>
    buildNewlyHighCriticalCountQuery(spaceId, index, timeRange, filters, 'previous'),
};

/**
 * The delta of the Risk movers tile. Both ends of the previous period come from the risk score
 * history, which is checked first (the start and the end of the previous period must have scores).
 */
export const useRiskMoversDelta = (options: RiskTileDeltaOptions) =>
  useRiskTileDelta(RISK_MOVERS, options);

/** The delta of the Newly high/critical tile, built like {@link useRiskMoversDelta}. */
export const useNewlyHighCriticalDelta = (options: RiskTileDeltaOptions) =>
  useRiskTileDelta(NEWLY_HIGH_CRITICAL, options);
