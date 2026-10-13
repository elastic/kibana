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
import { buildRiskHistoryExistsQuery } from '../queries/risk_previous_period';
import { readFirstNumber } from './read_first_number';
import {
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
  type TimeRange,
} from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';

/** The previous period barely changes between renders, so it stays fresh longer than the count. */
const PREVIOUS_PERIOD_STALE_TIME_MS = 30 * 60_000;

interface PreviousPeriodRiskTileOptions {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
  /** Identifies the tile in the query cache. */
  tileKey: string;
  buildPreviousQuery: (
    spaceId: string,
    entitiesIndexName: string,
    timeRange: TimeRange,
    entityFilterClauses: string[]
  ) => string;
}

/**
 * Runs a risk tile's previous-period query, and a cheap query that checks the risk history reaches
 * back to the start of the previous period. Without that history the previous period cannot be
 * compared, so the delta is left out.
 */
export const usePreviousPeriodRiskTile = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
  tileKey,
  buildPreviousQuery,
}: PreviousPeriodRiskTileOptions) => {
  const { data } = useKibana().services;
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);
  const index = resolvedIndex?.indexName;
  const isEnabled = !skip && !isIndexLoading && Boolean(index);

  const query = useMemo(
    () =>
      index
        ? buildPreviousQuery(spaceId, index, timeRange, buildEntityFilterClauses(entityFilters))
        : null,
    [buildPreviousQuery, spaceId, index, timeRange, entityFilters]
  );
  const historyQuery = useMemo(
    () => buildRiskHistoryExistsQuery(spaceId, timeRange),
    [spaceId, timeRange]
  );

  const search = async (esql: string, signal: AbortSignal | undefined) => {
    const result = await lastValueFrom(
      data.search.search(
        { params: { query: esql } },
        { abortSignal: signal, strategy: 'esql_async' }
      )
    );
    return result.rawResponse as unknown as ESQLSearchResponse;
  };

  const options = {
    keepPreviousData: true,
    staleTime: PREVIOUS_PERIOD_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  };

  const previousQuery = useQuery<number | undefined, SecurityAppError>(
    [`${tileKey}PrevPeriod`, query],
    async ({ signal }) =>
      query ? readFirstNumber(await search(query, signal), 'value') : undefined,
    { ...options, enabled: isEnabled && Boolean(query) }
  );
  const historyExists = useQuery<boolean, SecurityAppError>(
    ['riskHistoryAtPreviousPeriodStart', historyQuery],
    async ({ signal }) => readFirstNumber(await search(historyQuery, signal), 'boundary_docs') > 0,
    { ...options, enabled: isEnabled }
  );

  return {
    previous: previousQuery.data,
    hasHistory: historyExists.data,
    isFetching: previousQuery.isFetching || historyExists.isFetching,
    isError: previousQuery.isError || historyExists.isError,
    // Once the index has loaded, a missing one means the queries can never run.
    isUnavailable: !skip && !isIndexLoading && !index,
  };
};

/**
 * Turns a risk tile's count and its previous-period result into the delta. It is undefined while
 * loading (with `isDeltaLoading` true), when a query failed, and when the risk history does not
 * reach back to the start of the previous period (with `isHistoryMissing` true).
 */
export const getRiskTileDelta = ({
  count,
  skip,
  previous,
  hasHistory,
  isFetching,
  isError,
  isUnavailable = false,
}: {
  count: number;
  skip?: boolean;
  previous: number | undefined;
  hasHistory: boolean | undefined;
  isFetching: boolean;
  isError: boolean;
  isUnavailable?: boolean;
}) => {
  const isReady = previous !== undefined && hasHistory !== undefined && !isFetching;
  return {
    delta: isReady && hasHistory ? count - previous : undefined,
    isDeltaLoading: !skip && !isReady && !isError && !isUnavailable,
    // Known not to reach back to the start of the previous period: the tile says so.
    isHistoryMissing: !skip && !isError && isReady && !hasHistory,
  };
};
