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
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import type { TimeRange } from '../../use_time_range_param';
import { parseTrailingDots } from '../queries/tile_trailing_dots';

interface UseTrailingTileSeriesOpts {
  /** Identifies the tile in the query cache. */
  tileKey: string;
  /** Trailing-window ES|QL query (one row, one column per dot), or null while its inputs load. */
  query: string | null;
  timeRange: TimeRange;
  /** Returns the result column of dot `k` (0 = newest). */
  columnOf: (k: number) => string;
  /** Reads the response into oldest-first dots; by default one value per dot from `columnOf`. */
  parse?: (raw: ESQLSearchResponse, timeRange: TimeRange) => number[];
  /** Hold the query until the headline count and delta have loaded. */
  enabled: boolean;
  /** Message of the error toast shown when the query fails. */
  errorMessage: string;
  /** Run only against the local cluster (for data that is not cross-project searchable). */
  localOnly?: boolean;
}

/**
 * Runs a trailing-window series query and returns one value per dot, oldest first. `values` is
 * undefined until the first result. A failing query only shows an error toast; it never touches
 * the tile's count.
 */
export const useTrailingTileSeries = ({
  tileKey,
  query,
  timeRange,
  columnOf,
  parse = (raw, range) => parseTrailingDots(raw, range, columnOf),
  enabled,
  errorMessage,
  localOnly = false,
}: UseTrailingTileSeriesOpts) => {
  const { data } = useKibana().services;
  const isEnabled = enabled && Boolean(query);

  const {
    data: values,
    isLoading,
    isFetching,
    error,
  } = useQuery<number[], SecurityAppError>(
    ['trailingTileSeries', tileKey, query, timeRange],
    async ({ signal }) => {
      if (!query) return parse({ columns: [], values: [] }, timeRange);
      const raw = await lastValueFrom(
        data.search.search(
          { params: { query } },
          {
            abortSignal: signal,
            strategy: 'esql_async',
            ...(localOnly ? { projectRouting: '_alias:_origin' } : {}),
          }
        )
      );
      return parse(raw.rawResponse as unknown as ESQLSearchResponse, timeRange);
    },
    {
      enabled: isEnabled,
      keepPreviousData: true,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const filteredError = error?.message?.includes('Unknown index') ? undefined : error;
  useErrorToast(errorMessage, filteredError ?? undefined);

  return { values, isLoading: isEnabled && (isLoading || isFetching) };
};
