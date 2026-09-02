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
import { EntityType } from '../../../../../common/entity_analytics/types';
import { useKibana } from '../../../../common/lib/kibana';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import { useRiskEngineStatus } from '../../../api/hooks/use_risk_engine_status';
import { getEntitiesAlias, ENTITY_LATEST } from '../constants';
import type { AttentionEntry, FaceliftIdentity } from '../facelift/v1/data';
import { attentionReasonsFor } from '../facelift/v1/data';
import { buildAttentionEntriesQuery } from '../queries/attention_entries_query';

const ENTITY_TYPE_MAP: Record<string, EntityType> = {
  user: EntityType.user,
  host: EntityType.host,
  service: EntityType.service,
};

export const useNeedsAttentionEntries = ({
  spaceId,
  watchlistId,
  skip,
}: {
  spaceId: string;
  watchlistId?: string;
  skip?: boolean;
}) => {
  const { data } = useKibana().services;
  const { filterQuery } = useGlobalFilterQuery();
  const { data: riskEngineStatus, isFetching: isStatusLoading } = useRiskEngineStatus();

  const index = getEntitiesAlias(ENTITY_LATEST, spaceId);
  const query = useMemo(() => buildAttentionEntriesQuery(index, watchlistId), [index, watchlistId]);

  const isEnabled =
    !skip && !isStatusLoading && riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED';

  const queryKey = useMemo(
    () => ['needsAttentionEntries', query, filterQuery],
    [query, filterQuery]
  );

  const { data: entries, isLoading, isRefetching, error } = useQuery(
    queryKey,
    async ({ signal }) => {
      const searchResult = await lastValueFrom(
        data.search.search(
          {
            params: {
              query,
              ...(filterQuery ? { filter: filterQuery } : {}),
            },
          },
          {
            abortSignal: signal,
            strategy: 'esql_async',
            projectRouting: '_alias:_origin',
          }
        )
      );

      const rawResponse = searchResult.rawResponse as unknown as ESQLSearchResponse;
      const columns = rawResponse.columns ?? [];
      const values = rawResponse.values ?? [];

      const colIdx = (name: string) => columns.findIndex((c) => c.name === name);
      const idCol = colIdx('entity.id');
      const nameCol = colIdx('entity.name');
      const typeCol = colIdx('entity.EngineMetadata.Type');
      const scoreCol = colIdx('entity.risk.calculated_score_norm');
      const criticalityCol = colIdx('asset.criticality');

      return values.map((row): AttentionEntry => {
        const riskScore = (row[scoreCol] as number) ?? 0;
        const rawType = ((row[typeCol] as string) ?? '').toLowerCase();
        const identity: FaceliftIdentity = {
          id: (row[idCol] as string) ?? '',
          name: (row[nameCol] as string) ?? 'Unknown',
          entityType: ENTITY_TYPE_MAP[rawType] ?? EntityType.user,
          riskScore,
          riskDelta24h: 0,
          criticality: (row[criticalityCol] as FaceliftIdentity['criticality']) ?? 'unassigned',
          alerts: 0,
          lastSeen: '',
          isPrivileged: false,
          isNewToCritical: false,
          hasNewAnomalies: false,
          isDormantActive: false,
        };
        return { identity, reasons: attentionReasonsFor(identity) };
      });
    },
    {
      keepPreviousData: true,
      enabled: isEnabled,
      retry: 1,
    }
  );

  return {
    entries: entries ?? [],
    isLoading: isLoading || isRefetching || isStatusLoading,
    error,
  };
};
