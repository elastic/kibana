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
import { useKibana } from '../../../../../common/lib/kibana';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { buildNewEntityCountQuery } from '../queries/new_entity_query';
import { EMPTY_ENTITY_FILTERS, getEntityFilterESQL } from '../../use_entity_filters_param';
import { useNewEntityCount } from './use_new_entity_count';
import { readFirstNumber } from './read_first_number';

type NewEntityCountOptions = Parameters<typeof useNewEntityCount>[0];

/** The previous period barely changes between renders, so it stays fresh longer than the count. */
const PREVIOUS_PERIOD_STALE_TIME_MS = 30 * 60_000;

/**
 * Runs the New entity query for the previous period, the same query and rules as the count with the
 * window moved back one range. A failing query only leaves the delta empty.
 */
const usePreviousPeriodNewEntityCount = ({
  spaceId,
  skip,
  timeRange = '7d',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: NewEntityCountOptions) => {
  const { data } = useKibana().services;
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () =>
      index
        ? buildNewEntityCountQuery(index, timeRange, getEntityFilterESQL(entityFilters), 'previous')
        : null,
    [index, timeRange, entityFilters]
  );

  const {
    data: previous,
    isFetching,
    isError,
  } = useQuery<number | undefined, SecurityAppError>(
    ['newEntityCountPrevPeriod', query],
    async ({ signal }) => {
      if (!query) return undefined;
      const result = await lastValueFrom(
        data.search.search(
          { params: { query } },
          { abortSignal: signal, strategy: 'esql_async', projectRouting: '_alias:_origin' }
        )
      );
      return readFirstNumber(result.rawResponse as unknown as ESQLSearchResponse, 'value');
    },
    {
      enabled: !skip && !isIndexLoading && Boolean(index),
      keepPreviousData: true,
      staleTime: PREVIOUS_PERIOD_STALE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Once the index has loaded, a missing one means the query can never run.
  const isUnavailable = !skip && !isIndexLoading && !index;

  return { previous, isFetching, isError, isUnavailable };
};

/**
 * The New entity tile with its period-over-period delta. The previous-period query starts once the
 * count has loaded, so the delta never delays the count. While it runs the delta is undefined and
 * `isDeltaLoading` is true; if it fails the delta stays undefined and no spinner is shown.
 */
export const useNewEntityCountWithDelta = (opts: NewEntityCountOptions) => {
  const main = useNewEntityCount(opts);
  const { previous, isFetching, isError, isUnavailable } = usePreviousPeriodNewEntityCount({
    ...opts,
    skip: opts.skip || main.isLoading,
  });

  const hasPrevious = previous !== undefined && !isFetching;

  return {
    ...main,
    delta: hasPrevious ? main.count - previous : undefined,
    isDeltaLoading: !opts.skip && !hasPrevious && !isError && !isUnavailable,
  };
};
