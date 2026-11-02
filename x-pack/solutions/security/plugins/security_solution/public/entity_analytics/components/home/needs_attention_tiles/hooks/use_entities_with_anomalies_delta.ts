/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useTileQueryInputs } from './use_tile_query_inputs';
import { buildEntitiesWithAnomaliesCountQuery } from '../queries/entities_with_anomalies_query';
import { buildAnomaliesHistoryReachesBackQuery } from '../queries/history_reaches_back';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import type { EntityFilters, TimeRange } from '../../entities_grid/common';
import { readFirstNumber } from './read_first_number';
import { isDeltaStillComing, usePreviousPeriod } from './use_previous_period';

interface AnomaliesDeltaOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** True once all the page's counts have loaded; the deltas never delay a count. */
  isReady: boolean;
  /** The live count, which the previous period is compared with. */
  count: number;
}

/**
 * The delta of the Entities with anomalies tile. Like the count it needs the installed security
 * ML jobs. It runs only once the page's counts have loaded and its own count is above 0, after a
 * check that the anomaly records reach back twice the range.
 */
export const useEntitiesWithAnomaliesDelta = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
  isReady,
  count,
}: AnomaliesDeltaOptions): {
  delta: number | undefined;
  /** The count over the previous period, which the sparkline starts from. */
  previous: number | undefined;
  isDeltaLoading: boolean;
  isHistoryMissing: boolean;
  /** True once the history check passed, so the sparkline can follow the same rule. */
  reachesBack: boolean | undefined;
} => {
  const {
    data: resolvedIndex,
    isLoading: isIndexLoading,
    entityFilterClauses,
  } = useTileQueryInputs(spaceId, entityFilters);
  const { jobIds, loading: isJobsLoading } = useInstalledSecurityJobsIds();
  const index = resolvedIndex?.indexName;
  const isLoadingInputs = isIndexLoading || isJobsLoading;
  const hasInputs = Boolean(index) && jobIds.length > 0;

  const guardQuery =
    jobIds.length > 0 ? buildAnomaliesHistoryReachesBackQuery(timeRange, jobIds) : null;
  const previousQuery = useMemo(
    () =>
      index && jobIds.length > 0
        ? buildEntitiesWithAnomaliesCountQuery(
            index,
            timeRange,
            entityFilterClauses,
            jobIds,
            'previous'
          )
        : null,
    [index, jobIds, timeRange, entityFilterClauses]
  );

  const { previous, reachesBack, isHistoryMissing, isError } = usePreviousPeriod({
    tileKey: 'entitiesWithAnomalies',
    guardQuery,
    previousQuery,
    enabled: !skip && isReady && count > 0 && !isLoadingInputs && hasInputs,
    parse: (raw) => readFirstNumber(raw, 'value'),
  });

  return {
    delta: previous !== undefined ? count - previous : undefined,
    previous,
    isHistoryMissing,
    reachesBack,
    isDeltaLoading: isDeltaStillComing({
      skip,
      count,
      // Once the inputs have loaded, no installed job or no index means the query can never run.
      isUnavailable: !skip && !isLoadingInputs && !hasInputs,
      isError,
      isHistoryMissing,
      hasDelta: previous !== undefined,
    }),
  };
};
