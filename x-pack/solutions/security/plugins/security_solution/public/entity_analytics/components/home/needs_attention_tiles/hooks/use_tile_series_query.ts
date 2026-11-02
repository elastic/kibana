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
import { TILE_QUERY_CACHE_OPTIONS } from './tile_query_cache';
import { retryUnlessTimedOut, runWithTileTimeout } from './tile_query_timeout';
import { TILE_PROJECT_ROUTING } from './tile_project_routing';

interface TileSeriesQueryOptions<T> {
  /** Identifies the tile in the query cache. */
  tileKey: string;
  /** The series ES|QL query, or null while its inputs load. */
  query: string | null;
  enabled: boolean;
  /** Reads the response; throwing leaves the line out. */
  parse: (raw: ESQLSearchResponse) => T;
}

/** Runs a tile's series query and returns what `parse` reads from it. */
export const useTileSeriesQuery = <T>({
  tileKey,
  query,
  enabled,
  parse,
}: TileSeriesQueryOptions<T>): { series: T | undefined; isFetching: boolean; isError: boolean } => {
  const { data } = useKibana().services;

  const {
    data: series,
    isFetching,
    isPreviousData,
    isError,
  } = useQuery<T | undefined, SecurityAppError>(
    [tileKey, query],
    async ({ signal }) => {
      if (!query) return undefined;
      const result = await runWithTileTimeout(signal, (tileSignal) =>
        lastValueFrom(
          data.search.search(
            { params: { query } },
            {
              abortSignal: tileSignal,
              strategy: 'esql_async',
              projectRouting: TILE_PROJECT_ROUTING,
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

  // While the query waits (disabled) or runs for a new range, `keepPreviousData` still holds the
  // answer of the old one: it must not be taken for this range's series.
  return { series, isFetching: isFetching || isPreviousData, isError };
};

/**
 * Whether a tile's series may run: the same rule as its delta. It needs the page's counts and the
 * delta to have settled, a count that came back (also a count of 0) and a history that reaches back
 * twice the range. The count is checked here and not only through the delta: the history check is
 * cached independently of the entity filters, so a count that timed out after a filter change can
 * still see `reachesBack` from an earlier load. Once those have settled and it may not run, the tile
 * has no line (`isHidden`) and no spinner.
 */
export const getSeriesGate = ({
  isReady,
  reachesBack,
  hasCount,
}: {
  isReady: boolean;
  /** True when the tile's count came back; a failed or timed-out count has no line to draw. */
  hasCount: boolean;
  /** From the tile's delta hook; undefined until its history check settles, or after it failed. */
  reachesBack: boolean | undefined;
}): { canRun: boolean; isHidden: boolean } => {
  const canRun = isReady && hasCount && reachesBack === true;
  return { canRun, isHidden: isReady && !canRun };
};

interface TileTrendOptions {
  dots: number[] | undefined;
  /** The live count, which replaces the newest dot so the line ends on the number shown. */
  liveCount: number;
  /**
   * The count the tile's delta compares with: the count over the range that ended one range ago.
   * Each dot is a rolling count over a full range, and the oldest dot ends one step later than this
   * baseline, so it goes first. The line then runs from the baseline to the live count, and
   * last - first equals the delta. Without a delta there is no baseline and the line keeps its dots.
   */
  deltaBaseline?: number;
  skip?: boolean;
  isFetching: boolean;
  isError: boolean;
  /** The query can never run, for example the entities index is missing. */
  isUnavailable?: boolean;
  /** The series is left out on purpose (see {@link getSeriesGate}): no line and no spinner. */
  isHidden?: boolean;
}

/**
 * Turns a series into what the tile shows: the dots ending on the live count, led by the delta's
 * baseline when it has one, or none while it loads (also for a stale range). After an error, or
 * when it cannot run, there is no line and no spinner.
 */
export const getTileTrend = ({
  dots,
  liveCount,
  deltaBaseline,
  skip,
  isFetching,
  isError,
  isUnavailable = false,
  isHidden = false,
}: TileTrendOptions): { trend: number[] | undefined; isTrendLoading: boolean } => {
  const hasSeries = dots !== undefined && !isFetching && !isHidden;
  return {
    trend: hasSeries
      ? [...(deltaBaseline === undefined ? [] : [deltaBaseline]), ...dots.slice(0, -1), liveCount]
      : undefined,
    isTrendLoading: !skip && !hasSeries && !isError && !isUnavailable && !isHidden,
  };
};
