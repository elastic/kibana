/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../common/lib/kibana';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useTileQueryInputs } from './use_tile_query_inputs';
import { EMPTY_ENTITY_IDS } from '../data';
import { buildNewEntityCountQuery } from '../queries/new_entity_query';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import type { EntityFilters, TimeRange } from '../../entities_grid/common';
import { TILE_QUERY_CACHE_OPTIONS } from './tile_query_cache';
import { isTileQueryTimeout, retryUnlessTimedOut, runWithTileTimeout } from './tile_query_timeout';

export const useNewEntityCount = ({
  spaceId,
  skip,
  timeRange = '7d',
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

  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () => (index ? buildNewEntityCountQuery(index, timeRange, entityFilterClauses) : null),
    [index, timeRange, entityFilterClauses]
  );

  const isEnabled = !skip && !isIndexLoading && Boolean(index);

  const queryKey = useMemo(() => ['newEntityCount', query], [query]);

  const {
    data: result,
    isInitialLoading: isLoading,
    isFetching,
    error,
  } = useQuery(
    queryKey,
    async ({ signal }) => {
      if (!query) return { count: 0, entityIds: [] };
      const searchResult = await runWithTileTimeout(signal, (tileSignal) =>
        lastValueFrom(
          data.search.search(
            { params: { query } },
            {
              abortSignal: tileSignal,
              strategy: 'esql_async',
              projectRouting: '_alias:_origin',
            }
          )
        )
      );

      const rawResponse = searchResult.rawResponse as unknown as ESQLSearchResponse;
      const row = rawResponse.values?.[0];
      const valueIndex = rawResponse.columns?.findIndex((c) => c.name === 'value') ?? 0;
      const entityIdsIndex = rawResponse.columns?.findIndex((c) => c.name === 'entity_ids') ?? 1;
      const rawIds = row?.[entityIdsIndex];
      return {
        count: typeof row?.[valueIndex] === 'number' ? (row[valueIndex] as number) : 0,
        entityIds: Array.isArray(rawIds)
          ? (rawIds as string[]).filter(Boolean)
          : typeof rawIds === 'string' && rawIds
          ? [rawIds]
          : [],
      };
    },
    {
      keepPreviousData: true,
      ...TILE_QUERY_CACHE_OPTIONS,
      refetchOnWindowFocus: false,
      enabled: isEnabled,
      retry: retryUnlessTimedOut,
    }
  );

  // The inputs can time out too (the group filter overrides). Either way the tile says so, and a
  // timed-out refetch does not leave the last count on show as if it were current.
  const isTimedOut = isTileQueryTimeout(error) || isTileQueryTimeout(indexError);
  const shownResult = isTimedOut ? undefined : result;

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.newEntity.queryError', {
      defaultMessage: 'There was an error loading new entity data',
    }),
    // A timeout gets one notice for the whole page, and a message on the tile, not a toast per tile.
    isTimedOut ? undefined : (error as SecurityAppError | undefined) ?? indexError
  );

  return {
    count: shownResult?.count ?? 0,
    // True only when the count query returned a result. A skipped, failed, timed-out or no-access
    // count is not a genuine 0, so the tile must not show `count` (0) for it.
    hasCount: shownResult !== undefined && !error && !indexError,
    entityIds: isFetching ? EMPTY_ENTITY_IDS : shownResult?.entityIds ?? EMPTY_ENTITY_IDS,
    // A query that can never run (no index, failed inputs) is not loading: react-query reports a
    // disabled query with no data as loading for ever.
    isLoading: isIndexLoading || (isEnabled && (isLoading || isFetching)),
    // True while the count is on its way, not when its query can never run (skipped, no index, no job).
    isCountPending: isIndexLoading || (isEnabled && (isLoading || isFetching)),
    error: (error as SecurityAppError | undefined) ?? indexError,
    isTimedOut,
  };
};
