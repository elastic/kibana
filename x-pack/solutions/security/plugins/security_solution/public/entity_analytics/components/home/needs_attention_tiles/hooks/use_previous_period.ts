/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useKibana } from '../../../../../common/lib/kibana';
import { REACHES_BACK_COLUMN } from '../queries/history_reaches_back';
import { TILE_QUERY_CACHE_OPTIONS } from './tile_query_cache';
import { retryUnlessTimedOut, runWithTileTimeout } from './tile_query_timeout';

interface PreviousPeriodQueryOptions<T> {
  queryKey: string;
  query: string | null;
  enabled: boolean;
  parse: (raw: ESQLSearchResponse) => T;
  localOnly?: boolean;
}

/**
 * Runs one query of a delta. `isPending` is true while it runs and while the cache still shows the
 * answer of another range (`keepPreviousData`), so a stale answer is never mistaken for the current one.
 */
const usePreviousPeriodQuery = <T>({
  queryKey,
  query,
  enabled,
  parse,
  localOnly = false,
}: PreviousPeriodQueryOptions<T>): {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
} => {
  const { data: services } = useKibana().services;

  const { data, isFetching, isPreviousData, isError } = useQuery<T | undefined, SecurityAppError>(
    [queryKey, query],
    async ({ signal }) => {
      if (!query) return undefined;
      const result = await runWithTileTimeout(signal, (tileSignal) =>
        lastValueFrom(
          services.search.search(
            { params: { query } },
            {
              abortSignal: tileSignal,
              strategy: 'esql_async',
              ...(localOnly ? { projectRouting: '_alias:_origin' } : {}),
            }
          )
        )
      );
      return parse(result.rawResponse as unknown as ESQLSearchResponse);
    },
    {
      enabled: enabled && Boolean(query),
      keepPreviousData: true,
      ...TILE_QUERY_CACHE_OPTIONS,
      refetchOnWindowFocus: false,
      retry: retryUnlessTimedOut,
    }
  );

  return { data, isPending: isFetching || isPreviousData, isError };
};

/**
 * Reads the boolean of a history check (see `queries/history_reaches_back.ts`). A missing column
 * throws, so the delta is left out rather than read from a wrong column.
 */
export const parseReachesBack = (raw: ESQLSearchResponse): boolean => {
  const row = raw.values?.[0];
  if (!row) return false;
  const index = raw.columns?.findIndex((c) => c.name === REACHES_BACK_COLUMN) ?? -1;
  if (index < 0) throw new Error(`The ES|QL response has no "${REACHES_BACK_COLUMN}" column`);
  return row[index] === true;
};

interface PreviousPeriodOptions<T> {
  /** Identifies the tile in the query cache. */
  tileKey: string;
  /**
   * Identifies the history check in the query cache, when tiles read the same source with the same
   * query and should share one request. Defaults to `tileKey`.
   */
  guardKey?: string;
  /** The history check of the tile's source, or null while its inputs load. */
  guardQuery: string | null;
  /** The tile's query for the previous period (count only), or null while its inputs load. */
  previousQuery: string | null;
  /** True once the page's counts have loaded, the tile is not skipped and its count is above 0. */
  enabled: boolean;
  parse: (raw: ESQLSearchResponse) => T;
  /** Run only against the local cluster, like the tile's count. */
  localOnly?: boolean;
}

/**
 * The previous period of a tile. It first checks that the tile's history reaches back twice the
 * range, and only then runs the previous-period query. `previous` is set only when both have
 * settled for the current range and nothing failed; a failed query leaves it empty even when the
 * cache still holds an older answer. `isHistoryMissing` is true only once the check has settled.
 */
export const usePreviousPeriod = <T>({
  tileKey,
  guardKey = tileKey,
  guardQuery,
  previousQuery,
  enabled,
  parse,
  localOnly,
}: PreviousPeriodOptions<T>): {
  previous: T | undefined;
  /**
   * True or false once the history check has settled without an error, otherwise undefined. It does
   * not depend on the previous-period query, so a sparkline can follow it when only that query fails.
   */
  reachesBack: boolean | undefined;
  isHistoryMissing: boolean;
  isError: boolean;
} => {
  const guard = usePreviousPeriodQuery({
    queryKey: `${guardKey}HistoryReachesBack`,
    query: guardQuery,
    enabled,
    parse: parseReachesBack,
    localOnly,
  });
  const guardSettled = guard.data !== undefined && !guard.isPending;
  const hasHistory = guardSettled && guard.data === true;

  const previousPeriod = usePreviousPeriodQuery({
    queryKey: `${tileKey}PrevPeriod`,
    query: previousQuery,
    enabled: enabled && hasHistory,
    parse,
    localOnly,
  });

  const isError = guard.isError || previousPeriod.isError;
  const isPreviousSettled = previousPeriod.data !== undefined && !previousPeriod.isPending;

  return {
    previous: !isError && hasHistory && isPreviousSettled ? previousPeriod.data : undefined,
    reachesBack: !guard.isError && guardSettled ? guard.data : undefined,
    isHistoryMissing: !isError && guardSettled && guard.data === false,
    isError,
  };
};

/**
 * Whether a delta can still arrive, for the spinner: not for a skipped tile, a zero count (the pill
 * is hidden then), a query that can never run, a failed query, a history that is too short (the
 * tile says so instead) or a delta that is already known.
 */
export const isDeltaStillComing = ({
  skip,
  count,
  isUnavailable,
  isError,
  isHistoryMissing,
  hasDelta,
}: {
  skip?: boolean;
  count: number;
  isUnavailable: boolean;
  isError: boolean;
  isHistoryMissing: boolean;
  hasDelta: boolean;
}): boolean => !skip && count > 0 && !isUnavailable && !isError && !isHistoryMissing && !hasDelta;
