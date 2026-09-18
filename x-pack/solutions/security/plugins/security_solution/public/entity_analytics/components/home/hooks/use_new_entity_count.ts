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
import { useKibana } from '../../../../common/lib/kibana';
import { useRiskEngineStatus } from '../../../api/hooks/use_risk_engine_status';
import { getEntitiesAlias, ENTITY_LATEST } from '../constants';
import type { TimeRange } from '../use_time_range_param';
import {
  getEntityFilterESQL,
  EMPTY_ENTITY_FILTERS,
  type EntityFilters,
} from '../use_entity_filters_param';

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
  const { data: riskEngineStatus, isLoading: isStatusLoading } = useRiskEngineStatus();

  const index = getEntitiesAlias(ENTITY_LATEST, spaceId);
  const parts = [
    `FROM ${index}`,
    `| WHERE entity.lifecycle.first_seen >= NOW() - ${TIME_RANGE_TO_ESQL[timeRange]} AND entity.risk.calculated_score > 0`,
    ...getEntityFilterESQL(entityFilters),
    `| EVAL effective_id = COALESCE(\`entity.relationships.resolution.resolved_to\`, entity.id)`,
    `| STATS value = COUNT_DISTINCT(effective_id), entity_ids = VALUES(entity.id)`,
  ];
  const query = parts.join('\n');

  const isEnabled =
    !skip && !isStatusLoading && riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED';

  const queryKey = useMemo(() => ['newEntityCount', query], [query]);

  const {
    data: result,
    isLoading,
    error,
  } = useQuery(
    queryKey,
    async ({ signal }) => {
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
      return {
        count: typeof row?.[valueIndex] === 'number' ? (row[valueIndex] as number) : 0,
        entityIds: Array.isArray(row?.[entityIdsIndex]) ? (row[entityIdsIndex] as string[]) : [],
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

  return {
    count: result?.count ?? 0,
    entityIds: result?.entityIds ?? [],
    isLoading: isLoading || isStatusLoading,
    error,
  };
};
