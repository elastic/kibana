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
import { useKibana } from '../../../../common/lib/kibana';
import { useRiskEngineStatus } from '../../../api/hooks/use_risk_engine_status';
import { buildRiskMoversCountQuery } from '../queries/tile_risk_movers_query';

export const useRiskMoversCount = ({
  spaceId,
  skip,
}: {
  spaceId: string;
  skip?: boolean;
}) => {
  const { data } = useKibana().services;
  const { data: riskEngineStatus, isFetching: isStatusLoading } = useRiskEngineStatus();

  const isEnabled =
    !skip &&
    !isStatusLoading &&
    riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED';

  const query = useMemo(() => buildRiskMoversCountQuery(spaceId), [spaceId]);

  const {
    data: queryResult,
    isLoading,
    isRefetching,
    error,
  } = useQuery<{ count: number; entityNames: string[] }, SecurityAppError>(
    ['riskMoversCount', query],
    async ({ signal }) => {
      const raw = await lastValueFrom(
        data.search.search(
          { params: { query } },
          { abortSignal: signal, strategy: 'esql_async' }
        )
      );
      const response = raw.rawResponse as unknown as ESQLSearchResponse;
      const row = response.values?.[0];
      const valueIndex = response.columns?.findIndex((c) => c.name === 'value') ?? 0;
      const entityNamesIndex = response.columns?.findIndex((c) => c.name === 'entity_names') ?? -1;
      const count = typeof row?.[valueIndex] === 'number' ? (row[valueIndex] as number) : 0;
      const rawIds = entityNamesIndex >= 0 ? row?.[entityNamesIndex] : undefined;
      const entityNames: string[] = Array.isArray(rawIds)
        ? (rawIds as string[]).filter(Boolean)
        : typeof rawIds === 'string' && rawIds
        ? [rawIds]
        : [];
      return { count, entityNames };
    },
    {
      enabled: isEnabled,
      keepPreviousData: true,
      retry: 1,
    }
  );

  const filteredError =
    (error as SecurityAppError | undefined)?.message?.includes('Unknown index')
      ? undefined
      : (error as SecurityAppError | undefined);

  return {
    count: queryResult?.count ?? 0,
    entityNames: queryResult?.entityNames ?? [],
    isLoading: isStatusLoading || isLoading || isRefetching,
    error: filteredError,
  };
};
