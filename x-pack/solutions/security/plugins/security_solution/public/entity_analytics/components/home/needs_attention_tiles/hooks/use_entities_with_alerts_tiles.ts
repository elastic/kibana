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
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useKibana } from '../../../../../common/lib/kibana';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import {
  buildAlertBasedTilesQuery,
  alertsWindow,
  alertsPrevWindow,
} from '../queries/entities_with_alerts_query';
import type { TimeRange } from '../../use_time_range_param';
import { EMPTY_ENTITY_IDS } from '../data';
import { useAlertBasedTilesTrend } from './use_alert_based_tiles_trend';
import {
  getEntityFilterESQL,
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
} from '../../use_entity_filters_param';

interface AlertBasedTilesResult {
  alertsCount: number;
  alertsEntityIds: string[];
  watchlistedCount: number;
  watchlistedEntityIds: string[];
}

export const parseAlertBasedTilesResponse = (raw: ESQLSearchResponse): AlertBasedTilesResult => {
  const row = raw.values?.[0];
  if (!row)
    return { alertsCount: 0, alertsEntityIds: [], watchlistedCount: 0, watchlistedEntityIds: [] };

  const col = (name: string) => raw.columns?.findIndex((c) => c.name === name) ?? -1;
  const toIds = (idx: number): string[] => {
    if (idx < 0) return [];
    const v = row[idx];
    if (Array.isArray(v)) return (v as string[]).filter(Boolean);
    if (typeof v === 'string' && v) return [v];
    return [];
  };

  return {
    alertsCount:
      typeof row[col('alerts_count')] === 'number' ? (row[col('alerts_count')] as number) : 0,
    alertsEntityIds: toIds(col('alerts_entity_ids')),
    watchlistedCount:
      typeof row[col('watchlisted_count')] === 'number'
        ? (row[col('watchlisted_count')] as number)
        : 0,
    watchlistedEntityIds: toIds(col('watchlisted_entity_ids')),
  };
};

/**
 * Runs a single alerts query that produces counts and entity ID lists for both the
 * "entities with alerts" tile and the "watchlisted entities with alerts" tile.
 *
 * Running one query rather than two avoids executing the EUID pipeline twice, which
 * is expensive at high alert volumes. See buildAlertBasedTilesQuery for query details.
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
  const euidApi = useEntityStoreEuidApi();
  const {
    data: resolvedIndex,
    isLoading: isIndexLoading,
    error: indexError,
  } = useResolvedLatestEntitiesIndexName(spaceId);

  const isEnabled =
    !skip && !isIndexLoading && Boolean(euidApi) && Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!resolvedIndex?.indexName || !euidApi) return null;
    return buildAlertBasedTilesQuery(
      euidApi.euid,
      resolvedIndex.indexName,
      spaceId,
      alertsWindow(timeRange),
      getEntityFilterESQL(entityFilters)
    );
  }, [euidApi, resolvedIndex?.indexName, spaceId, timeRange, entityFilters]);

  const {
    data: queryResult,
    isLoading,
    isFetching,
    error,
  } = useQuery<AlertBasedTilesResult, SecurityAppError>(
    ['alertBasedTiles', query],
    async ({ signal }) => {
      if (!query)
        return {
          alertsCount: 0,
          alertsEntityIds: [],
          watchlistedCount: 0,
          watchlistedEntityIds: [],
        };
      const raw = await lastValueFrom(
        data.search.search({ params: { query } }, { abortSignal: signal, strategy: 'esql_async' })
      );
      return parseAlertBasedTilesResponse(raw.rawResponse as unknown as ESQLSearchResponse);
    },
    {
      enabled: isEnabled && Boolean(query),
      keepPreviousData: true,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const filteredError = (error as SecurityAppError | undefined)?.message?.includes('Unknown index')
    ? undefined
    : (error as SecurityAppError | undefined);

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.alertBasedTiles.queryError', {
      defaultMessage: 'There was an error loading entity alert data',
    }),
    filteredError ?? indexError
  );

  return {
    alertsCount: queryResult?.alertsCount ?? 0,
    alertsEntityIds: isFetching
      ? EMPTY_ENTITY_IDS
      : queryResult?.alertsEntityIds ?? EMPTY_ENTITY_IDS,
    watchlistedCount: queryResult?.watchlistedCount ?? 0,
    watchlistedEntityIds: isFetching
      ? EMPTY_ENTITY_IDS
      : queryResult?.watchlistedEntityIds ?? EMPTY_ENTITY_IDS,
    isLoading: isIndexLoading || isLoading || isFetching,
    error: filteredError ?? indexError,
  };
};

interface AlertTileOpts {
  spaceId: string;
  skip?: boolean;
  timeRange?: TimeRange;
  entityFilters?: EntityFilters;
}

/**
 * Fetches only the previous period ([2×range ago, range ago)) using the same
 * pipeline and output shape as useAlertBasedTiles. The previous window barely
 * changes between renders so this hook uses a much longer staleTime (30 min).
 * It is meant to be started lazily — only after the main tile count resolves.
 */
const useAlertBasedTilesPrevPeriod = ({
  spaceId,
  skip,
  timeRange = '24h',
  entityFilters = EMPTY_ENTITY_FILTERS,
}: AlertTileOpts) => {
  const { data } = useKibana().services;
  const euidApi = useEntityStoreEuidApi();
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);

  const isEnabled =
    !skip && !isIndexLoading && Boolean(euidApi) && Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!resolvedIndex?.indexName || !euidApi) return null;
    return buildAlertBasedTilesQuery(
      euidApi.euid,
      resolvedIndex.indexName,
      spaceId,
      alertsPrevWindow(timeRange),
      getEntityFilterESQL(entityFilters)
    );
  }, [euidApi, resolvedIndex?.indexName, spaceId, timeRange, entityFilters]);

  const {
    data: queryResult,
    isLoading,
    isFetching,
  } = useQuery<AlertBasedTilesResult, SecurityAppError>(
    ['alertBasedTilesPrevPeriod', query],
    async ({ signal }) => {
      if (!query)
        return {
          alertsCount: 0,
          alertsEntityIds: [],
          watchlistedCount: 0,
          watchlistedEntityIds: [],
        };
      const raw = await lastValueFrom(
        data.search.search({ params: { query } }, { abortSignal: signal, strategy: 'esql_async' })
      );
      return parseAlertBasedTilesResponse(raw.rawResponse as unknown as ESQLSearchResponse);
    },
    {
      enabled: isEnabled && Boolean(query),
      keepPreviousData: true,
      // Previous window barely changes — cache for 30 min vs 5 min for current window.
      staleTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  return {
    alertsCount: queryResult?.alertsCount ?? 0,
    watchlistedCount: queryResult?.watchlistedCount ?? 0,
    // True while the prev-period query hasn't resolved yet. Callers should treat
    // the delta as unavailable and show a loading indicator rather than a stale value.
    isLoading: isLoading || isFetching,
  };
};

/**
 * Delta variant of useAlertBasedTiles.
 *
 * Runs two separate queries: the main tile query (current period, unchanged
 * from useAlertBasedTiles) and a previous-period query that starts lazily
 * once the main count has resolved. The delta pill therefore never delays
 * the primary tile count.
 *
 * The previous-period query uses a 30-minute staleTime — that window barely
 * changes between renders, so it is almost always served from cache after
 * the first load.
 *
 * Switch to useAlertBasedTiles at the call site to disable deltas entirely.
 */
export const useAlertBasedTilesWithDelta = (opts: AlertTileOpts) => {
  const main = useAlertBasedTiles(opts);
  const prev = useAlertBasedTilesPrevPeriod({
    ...opts,
    // Only start the prev-period query once the main count has resolved.
    skip: opts.skip || main.isLoading,
  });
  const trend = useAlertBasedTilesTrend({
    ...opts,
    // The sparkline starts only once both the count and the delta have resolved.
    skip: opts.skip || main.isLoading || prev.isLoading,
  });

  return {
    ...main,
    // When the prev-period query is still running, delta is undefined so the UI
    // can show a loading indicator rather than a misleading value (prev defaults
    // to 0 while loading, which would make delta appear to equal the full count).
    alertsDelta: prev.isLoading ? undefined : main.alertsCount - prev.alertsCount,
    watchlistedDelta: prev.isLoading ? undefined : main.watchlistedCount - prev.watchlistedCount,
    isDeltaLoading: prev.isLoading,
    alertsTrend: trend.alertsTrend,
    watchlistedTrend: trend.watchlistedTrend,
    isTrendLoading: trend.isLoading,
  };
};
