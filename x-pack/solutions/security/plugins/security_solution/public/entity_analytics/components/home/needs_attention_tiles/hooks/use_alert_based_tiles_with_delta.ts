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
import { buildAlertBasedTilesQuery } from '../queries/entities_with_alerts_query';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import { parseAlertBasedTilesResponse, useAlertBasedTiles } from './use_entities_with_alerts_tiles';

type AlertBasedTilesOptions = Parameters<typeof useAlertBasedTiles>[0];
type AlertBasedTilesResult = ReturnType<typeof parseAlertBasedTilesResponse>;

/** The previous period barely changes between renders, so it stays fresh longer than the count. */
const PREVIOUS_PERIOD_STALE_TIME_MS = 30 * 60_000;

/**
 * Runs the alert based tiles query for the previous period, the same query and rules as the
 * count with the window moved back one range. A failing query only leaves the delta empty.
 */
const usePreviousPeriodAlertBasedTiles = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: AlertBasedTilesOptions) => {
  const { data } = useKibana().services;
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);

  const isEnabled = !skip && !isIndexLoading && Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!resolvedIndex?.indexName) return null;
    return buildAlertBasedTilesQuery(
      resolvedIndex.indexName,
      spaceId,
      timeRange,
      buildEntityFilterClauses(entityFilters),
      'previous'
    );
  }, [resolvedIndex?.indexName, spaceId, timeRange, entityFilters]);

  const {
    data: previous,
    isFetching,
    isError,
  } = useQuery<AlertBasedTilesResult | undefined, SecurityAppError>(
    ['alertBasedTilesPrevPeriod', query],
    async ({ signal }) => {
      if (!query) return undefined;
      const raw = await lastValueFrom(
        data.search.search({ params: { query } }, { abortSignal: signal, strategy: 'esql_async' })
      );
      return parseAlertBasedTilesResponse(raw.rawResponse as unknown as ESQLSearchResponse);
    },
    {
      enabled: isEnabled && Boolean(query),
      keepPreviousData: true,
      staleTime: PREVIOUS_PERIOD_STALE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  return { previous, isFetching, isError };
};

/**
 * The alert based tiles (Entities with alerts and Watchlisted) with their period-over-period
 * delta. The previous-period query starts once the count has loaded, so the delta never delays
 * the count. While it runs the deltas are undefined and `isDeltaLoading` is true; if it fails
 * the deltas stay undefined and no spinner is shown.
 */
export const useAlertBasedTilesWithDelta = (opts: AlertBasedTilesOptions) => {
  const main = useAlertBasedTiles(opts);
  const { previous, isFetching, isError } = usePreviousPeriodAlertBasedTiles({
    ...opts,
    skip: opts.skip || main.isLoading,
  });

  const hasPrevious = previous !== undefined && !isFetching;

  return {
    ...main,
    severeAlertsDelta: hasPrevious
      ? main.severeAlertsCount - previous.severeAlertsCount
      : undefined,
    watchlistedDelta: hasPrevious ? main.watchlistedCount - previous.watchlistedCount : undefined,
    isDeltaLoading: !opts.skip && !hasPrevious && !isError,
  };
};
