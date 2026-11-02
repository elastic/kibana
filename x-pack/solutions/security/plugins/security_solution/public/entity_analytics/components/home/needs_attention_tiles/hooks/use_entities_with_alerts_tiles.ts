/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useKibana } from '../../../../../common/lib/kibana';
import { useTileQueryInputs } from './use_tile_query_inputs';
import { buildAlertBasedTilesQuery } from '../queries/entities_with_alerts_query';
import { EMPTY_ENTITY_IDS } from '../data';
import {
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
  type TimeRange,
} from '../../entities_grid/common';
import { TILE_QUERY_CACHE_OPTIONS } from './tile_query_cache';
import { isTileQueryTimeout, retryUnlessTimedOut, runWithTileTimeout } from './tile_query_timeout';

interface AlertBasedTilesResult {
  severeAlertsCount: number;
  severeAlertsEntityIds: string[];
  watchlistedCount: number;
  watchlistedEntityIds: string[];
}

const EMPTY_RESULT: AlertBasedTilesResult = {
  severeAlertsCount: 0,
  severeAlertsEntityIds: [],
  watchlistedCount: 0,
  watchlistedEntityIds: [],
};

export const parseAlertBasedTilesResponse = (raw: ESQLSearchResponse): AlertBasedTilesResult => {
  const row = raw.values?.[0];
  if (!row) return EMPTY_RESULT;

  const col = (name: string) => raw.columns?.findIndex((c) => c.name === name) ?? -1;
  const toIds = (idx: number): string[] => {
    if (idx < 0) return [];
    const v = row[idx];
    if (Array.isArray(v)) return (v as string[]).filter(Boolean);
    if (typeof v === 'string' && v) return [v];
    return [];
  };
  const toCount = (idx: number): number => {
    const v = idx < 0 ? undefined : row[idx];
    return typeof v === 'number' ? v : 0;
  };

  return {
    severeAlertsCount: toCount(col('severe_alerts_count')),
    severeAlertsEntityIds: toIds(col('severe_alerts_entity_ids')),
    watchlistedCount: toCount(col('watchlisted_count')),
    watchlistedEntityIds: toIds(col('watchlisted_entity_ids')),
  };
};

/**
 * Runs a single alerts query that produces counts and entity ID lists for the severely
 * alerting and the watchlisted & alerting tiles.
 *
 * Running one query rather than one per tile avoids executing the EUID pipeline several
 * times, which is expensive at high alert volumes. See buildAlertBasedTilesQuery for details.
 */
export const useAlertBasedTiles = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
}) => {
  const { data } = useKibana().services;
  const {
    data: resolvedIndex,
    isLoading: isIndexLoading,
    entityFilterClauses,
    error: indexError,
  } = useTileQueryInputs(spaceId, entityFilters);

  const isEnabled = !skip && !isIndexLoading && Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!resolvedIndex?.indexName) return null;
    return buildAlertBasedTilesQuery(
      resolvedIndex.indexName,
      spaceId,
      timeRange,
      entityFilterClauses
    );
  }, [resolvedIndex?.indexName, spaceId, timeRange, entityFilterClauses]);

  const {
    data: queryResult,
    isInitialLoading: isLoading,
    isFetching,
    error,
  } = useQuery<AlertBasedTilesResult, SecurityAppError>(
    ['alertBasedTiles', query],
    async ({ signal }) => {
      if (!query) return EMPTY_RESULT;
      const raw = await runWithTileTimeout(signal, (tileSignal) =>
        lastValueFrom(
          data.search.search(
            { params: { query } },
            { abortSignal: tileSignal, strategy: 'esql_async' }
          )
        )
      );
      return parseAlertBasedTilesResponse(raw.rawResponse as unknown as ESQLSearchResponse);
    },
    {
      enabled: isEnabled && Boolean(query),
      keepPreviousData: true,
      ...TILE_QUERY_CACHE_OPTIONS,
      refetchOnWindowFocus: false,
      retry: retryUnlessTimedOut,
    }
  );

  const filteredError = (error as SecurityAppError | undefined)?.message?.includes('Unknown index')
    ? undefined
    : (error as SecurityAppError | undefined);

  // The inputs can time out too (the group filter overrides). Either way the tile says so, and a
  // timed-out refetch does not leave the last count on show as if it were current.
  const isTimedOut = isTileQueryTimeout(error) || isTileQueryTimeout(indexError);
  const shownResult = isTimedOut ? undefined : queryResult;

  // A timeout gets one notice for the whole page, and a message on the tile, not a toast per tile.
  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.alertBasedTiles.queryError', {
      defaultMessage: 'There was an error loading entity alert data',
    }),
    isTimedOut ? undefined : filteredError ?? indexError
  );

  return {
    severeAlertsCount: shownResult?.severeAlertsCount ?? 0,
    // True only when the count query returned a result. A skipped, failed, timed-out or no-access
    // count is not a genuine 0, so the tile must not show `count` (0) for it.
    hasCount: shownResult !== undefined && !error && !indexError,
    severeAlertsEntityIds: isFetching
      ? EMPTY_ENTITY_IDS
      : shownResult?.severeAlertsEntityIds ?? EMPTY_ENTITY_IDS,
    watchlistedCount: shownResult?.watchlistedCount ?? 0,
    watchlistedEntityIds: isFetching
      ? EMPTY_ENTITY_IDS
      : shownResult?.watchlistedEntityIds ?? EMPTY_ENTITY_IDS,
    // A query that can never run (no index, failed inputs) is not loading: react-query reports a
    // disabled query with no data as loading for ever.
    isLoading: isIndexLoading || (isEnabled && Boolean(query) && (isLoading || isFetching)),
    // True while the count is on its way, not when its query can never run (skipped, no index, no job).
    isCountPending: isIndexLoading || (isEnabled && Boolean(query) && (isLoading || isFetching)),
    error: filteredError ?? indexError,
    isTimedOut,
  };
};
