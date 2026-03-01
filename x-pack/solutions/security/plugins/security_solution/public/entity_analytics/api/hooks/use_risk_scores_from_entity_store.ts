/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RiskScoreSortField } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useEntitiesListQuery } from '../../components/entity_store/hooks/use_entities_list_query';
import {
  transformFilterForEntityStore,
  buildEntityStoreRiskFilter,
  mergeFilters,
} from './use_risk_scores_from_entity_store_utils';
import type { EntityRiskFieldPrefix } from './use_risk_scores_from_entity_store_utils';

const ENTITY_STORE_INDEX_PATTERN_V2 = (namespace: string) =>
  `.entities.v2.latest.security_${namespace}`;

export interface UseRiskScoresFromEntityStoreParams {
  filterQuery?: string;
  pagination: { cursorStart: number; querySize: number };
  sort?: RiskScoreSortField;
  skip?: boolean;
}

export interface UseRiskScoresFromEntityStoreResult<TRiskScore> {
  data: TRiskScore[];
  totalCount: number;
  loading: boolean;
  refetch: () => void;
  inspect: { dsl: string[]; response: string[]; indexPattern: string[] };
  hasEngineBeenInstalled: boolean;
}

export interface UseRiskScoresFromEntityStoreConfig<TEntity, TRiskScore> {
  entityType: 'host' | 'user';
  fieldPrefix: EntityRiskFieldPrefix;
  sortFieldMapping: Record<string, string>;
  defaultSortField: string;
  entityKey: keyof TEntity;
  mapEntityToRiskScore: (entity: TEntity) => TRiskScore;
}

/**
 * Generic hook for fetching risk scores from entity store v2.
 * Used by useHostRiskScoresFromEntityStore and useUserRiskScoresFromEntityStore.
 */
export const useRiskScoresFromEntityStore = <TEntity extends Record<string, unknown>, TRiskScore>(
  config: UseRiskScoresFromEntityStoreConfig<TEntity, TRiskScore>,
  params: UseRiskScoresFromEntityStoreParams
): UseRiskScoresFromEntityStoreResult<TRiskScore> => {
  const { filterQuery, pagination, sort, skip = false } = params;
  const {
    entityType,
    fieldPrefix,
    sortFieldMapping,
    defaultSortField,
    entityKey,
    mapEntityToRiskScore,
  } = config;

  const spaceId = useSpaceId();
  const namespace = spaceId ?? 'default';

  const entitySortField = useMemo(() => {
    const field = sort?.field ?? defaultSortField;
    return sortFieldMapping[field] ?? 'entity.risk.calculated_score_norm';
  }, [sort?.field, defaultSortField, sortFieldMapping]);

  const entityFilterQuery = useMemo(() => {
    const transformed = transformFilterForEntityStore(filterQuery, fieldPrefix);
    const baseFilter = buildEntityStoreRiskFilter();
    return mergeFilters(baseFilter, transformed);
  }, [filterQuery, fieldPrefix]);

  const { cursorStart, querySize } = pagination;
  const page = Math.floor(cursorStart / querySize) + 1;

  const { data, isLoading, refetch } = useEntitiesListQuery({
    entityTypes: [entityType],
    page,
    perPage: querySize,
    sortField: entitySortField,
    sortOrder: sort?.direction ?? 'desc',
    filterQuery: entityFilterQuery,
    skip,
  });

  return useMemo(() => {
    const records = data?.records ?? [];
    const entities = records.filter(
      (entity: unknown): entity is TEntity =>
        entity != null &&
        typeof entity === 'object' &&
        entityKey in (entity as Record<string, unknown>)
    );
    const riskScores = entities.map(mapEntityToRiskScore);

    const totalCount = data?.total ?? 0;
    const inspect = data?.inspect
      ? {
          dsl: data.inspect.dsl ?? [],
          response: data.inspect.response ?? [],
          indexPattern: [ENTITY_STORE_INDEX_PATTERN_V2(namespace)],
        }
      : {
          dsl: [],
          response: [],
          indexPattern: [ENTITY_STORE_INDEX_PATTERN_V2(namespace)],
        };

    return {
      data: riskScores,
      totalCount,
      loading: isLoading,
      refetch: refetch as () => void,
      inspect,
      hasEngineBeenInstalled: true,
    };
  }, [data, isLoading, refetch, namespace, entityKey, mapEntityToRiskScore]);
};
