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

/** The series moves by one dot per step, so a result is kept for an hour. */
const SERIES_STALE_TIME_MS = 60 * 60_000;

interface TileSeriesQueryOptions<T> {
  /** Identifies the tile in the query cache. */
  tileKey: string;
  /** The series ES|QL query, or null while its inputs load. */
  query: string | null;
  enabled: boolean;
  /** Reads the response; throwing leaves the line out. */
  parse: (raw: ESQLSearchResponse) => T;
  /** Run only against the local cluster, like the tile's count. */
  localOnly?: boolean;
}

/** Runs a tile's series query and returns what `parse` reads from it. */
export const useTileSeriesQuery = <T>({
  tileKey,
  query,
  enabled,
  parse,
  localOnly = false,
}: TileSeriesQueryOptions<T>): { series: T | undefined; isFetching: boolean; isError: boolean } => {
  const { data } = useKibana().services;

  const {
    data: series,
    isFetching,
    isError,
  } = useQuery<T | undefined, SecurityAppError>(
    [tileKey, query],
    async ({ signal }) => {
      if (!query) return undefined;
      const result = await lastValueFrom(
        data.search.search(
          { params: { query } },
          {
            abortSignal: signal,
            strategy: 'esql_async',
            ...(localOnly ? { projectRouting: '_alias:_origin' } : {}),
          }
        )
      );
      return parse(result.rawResponse as unknown as ESQLSearchResponse);
    },
    {
      enabled: enabled && Boolean(query),
      keepPreviousData: true,
      staleTime: SERIES_STALE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  return { series, isFetching, isError };
};

interface TileTrendOptions {
  dots: number[] | undefined;
  /** The live count, which replaces the newest dot so the line ends on the number shown. */
  liveCount: number;
  skip?: boolean;
  isFetching: boolean;
  isError: boolean;
  /** The query can never run, for example the entities index is missing. */
  isUnavailable?: boolean;
}

/**
 * Turns a series into what the tile shows: the dots ending on the live count, or none while it
 * loads (also for a stale range). After an error, or when it cannot run, there is no line and no
 * spinner.
 */
export const getTileTrend = ({
  dots,
  liveCount,
  skip,
  isFetching,
  isError,
  isUnavailable = false,
}: TileTrendOptions): { trend: number[] | undefined; isTrendLoading: boolean } => {
  const hasSeries = dots !== undefined && !isFetching;
  return {
    trend: hasSeries ? [...dots.slice(0, -1), liveCount] : undefined,
    isTrendLoading: !skip && !hasSeries && !isError && !isUnavailable,
  };
};
