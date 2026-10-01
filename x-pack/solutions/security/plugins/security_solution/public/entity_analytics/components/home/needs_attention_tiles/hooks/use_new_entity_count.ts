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
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { EMPTY_ENTITY_IDS } from '../data';
import {
  buildEntityFilterClauses,
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
  type TimeRange,
} from '../../new_entities_table';

const TIME_RANGE_TO_ESQL: Record<TimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

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
    error: indexError,
  } = useResolvedLatestEntitiesIndexName(spaceId);

  const index = resolvedIndex?.indexName;

  const query = useMemo(
    () =>
      index
        ? [
            `FROM ${index}`,
            `| WHERE entity.lifecycle.first_seen >= NOW() - ${TIME_RANGE_TO_ESQL[timeRange]} AND entity.risk.calculated_score > 0`,
            ...buildEntityFilterClauses(entityFilters),
            `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
            `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
          ].join('\n')
        : null,
    [index, timeRange, entityFilters]
  );

  const isEnabled = !skip && !isIndexLoading && Boolean(index);

  const queryKey = useMemo(() => ['newEntityCount', query], [query]);

  const {
    data: result,
    isLoading,
    isFetching,
    error,
  } = useQuery(
    queryKey,
    async ({ signal }) => {
      if (!query) return { count: 0, entityIds: [] };
      const searchResult = await lastValueFrom(
        data.search.search(
          { params: { query } },
          {
            abortSignal: signal,
            strategy: 'esql_async',
            projectRouting: '_alias:_origin',
          }
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
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      enabled: isEnabled,
      retry: 1,
    }
  );

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.newEntity.queryError', {
      defaultMessage: 'There was an error loading new entity data',
    }),
    (error as SecurityAppError | undefined) ?? indexError
  );

  return {
    count: result?.count ?? 0,
    entityIds: isFetching ? EMPTY_ENTITY_IDS : result?.entityIds ?? EMPTY_ENTITY_IDS,
    isLoading: isIndexLoading || isLoading || isFetching,
    error: (error as SecurityAppError | undefined) ?? indexError,
  };
};
