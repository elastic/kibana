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
import { useRiskEngineStatus } from '../../../../api/hooks/use_risk_engine_status';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { buildAlertBasedTilesQuery } from '../queries/entities_with_alerts_query';
import type { TimeRange } from '../../use_time_range_param';
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
  const { data: riskEngineStatus, isLoading: isStatusLoading } = useRiskEngineStatus();
  const euidApi = useEntityStoreEuidApi();
  const { data: resolvedIndex, isLoading: isIndexLoading } =
    useResolvedLatestEntitiesIndexName(spaceId);

  const isEnabled =
    !skip &&
    !isStatusLoading &&
    !isIndexLoading &&
    riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED' &&
    Boolean(euidApi) &&
    Boolean(resolvedIndex?.indexName);

  const query = useMemo(() => {
    if (!resolvedIndex?.indexName || !euidApi) return null;
    return buildAlertBasedTilesQuery(
      euidApi.euid,
      resolvedIndex.indexName,
      spaceId,
      timeRange,
      getEntityFilterESQL(entityFilters)
    );
  }, [euidApi, resolvedIndex?.indexName, spaceId, timeRange, entityFilters]);

  const {
    data: queryResult,
    isLoading,
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
    filteredError
  );

  return {
    alertsCount: queryResult?.alertsCount ?? 0,
    alertsEntityIds: queryResult?.alertsEntityIds ?? [],
    watchlistedCount: queryResult?.watchlistedCount ?? 0,
    watchlistedEntityIds: queryResult?.watchlistedEntityIds ?? [],
    isLoading: isStatusLoading || isIndexLoading || isLoading,
    error: filteredError,
  };
};
