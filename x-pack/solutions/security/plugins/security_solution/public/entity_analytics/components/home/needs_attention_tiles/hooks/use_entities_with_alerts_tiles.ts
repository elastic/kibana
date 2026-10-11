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
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { buildAlertBasedTilesQuery } from '../queries/entities_with_alerts_query';
import { EMPTY_ENTITY_IDS } from '../data';
import {
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
  type TimeRange,
} from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';

interface AlertBasedTilesResult {
  severeAlertsCount: number;
  severeAlertsEntityIds: string[];
  watchlistedCount: number;
  watchlistedEntityIds: string[];
  newAlertingCount: number;
  newAlertingEntityIds: string[];
}

const EMPTY_RESULT: AlertBasedTilesResult = {
  severeAlertsCount: 0,
  severeAlertsEntityIds: [],
  watchlistedCount: 0,
  watchlistedEntityIds: [],
  newAlertingCount: 0,
  newAlertingEntityIds: [],
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
    newAlertingCount: toCount(col('new_alerting_count')),
    newAlertingEntityIds: toIds(col('new_alerting_entity_ids')),
  };
};

/**
 * Runs a single alerts query that produces counts and entity ID lists for the severely
 * alerting, watchlisted & alerting, and new & alerting tiles.
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
    error: indexError,
  } = useResolvedLatestEntitiesIndexName(spaceId);

  const isEnabled = !skip && !isIndexLoading && Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!resolvedIndex?.indexName) return null;
    return buildAlertBasedTilesQuery(
      resolvedIndex.indexName,
      spaceId,
      timeRange,
      buildEntityFilterClauses(entityFilters)
    );
  }, [resolvedIndex?.indexName, spaceId, timeRange, entityFilters]);

  const {
    data: queryResult,
    isLoading,
    isFetching,
    error,
  } = useQuery<AlertBasedTilesResult, SecurityAppError>(
    ['alertBasedTiles', query],
    async ({ signal }) => {
      if (!query) return EMPTY_RESULT;
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
    severeAlertsCount: queryResult?.severeAlertsCount ?? 0,
    severeAlertsEntityIds: isFetching
      ? EMPTY_ENTITY_IDS
      : queryResult?.severeAlertsEntityIds ?? EMPTY_ENTITY_IDS,
    watchlistedCount: queryResult?.watchlistedCount ?? 0,
    watchlistedEntityIds: isFetching
      ? EMPTY_ENTITY_IDS
      : queryResult?.watchlistedEntityIds ?? EMPTY_ENTITY_IDS,
    newAlertingCount: queryResult?.newAlertingCount ?? 0,
    newAlertingEntityIds: isFetching
      ? EMPTY_ENTITY_IDS
      : queryResult?.newAlertingEntityIds ?? EMPTY_ENTITY_IDS,
    isLoading: isIndexLoading || isLoading || isFetching,
    error: filteredError ?? indexError,
  };
};
