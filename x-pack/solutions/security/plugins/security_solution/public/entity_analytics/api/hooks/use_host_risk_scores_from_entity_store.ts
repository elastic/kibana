/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type {
  HostRiskScore,
  RiskScoreSortField,
  RiskStats,
} from '../../../../common/search_strategy';
import { RiskScoreFields } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useEntitiesListQuery } from '../../components/entity_store/hooks/use_entities_list_query';
import type { HostEntity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';

const ENTITY_STORE_INDEX_PATTERN_V2 = (namespace: string) =>
  `.entities.v2.latest.security_${namespace}`;

/**
 * Maps RiskScoreFields (old risk index) to entity store v2 field names.
 * Entity store v2 uses entity.risk.* for all entity types.
 */
const RISK_SCORE_TO_ENTITY_STORE_SORT_FIELD: Record<string, string> = {
  [RiskScoreFields.timestamp]: '@timestamp',
  [RiskScoreFields.hostName]: 'host.name',
  [RiskScoreFields.hostRiskScore]: 'entity.risk.calculated_score_norm',
  [RiskScoreFields.hostRisk]: 'entity.risk.calculated_level',
};

/**
 * Transforms filter query from risk index field names (host.risk.*) to entity store v2 (entity.risk.*).
 */
const transformFilterForEntityStore = (filterQuery: string | undefined): string | undefined => {
  if (!filterQuery || filterQuery === '{}' || filterQuery === '""') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(filterQuery) as Record<string, unknown>;
    const str = JSON.stringify(parsed);
    return str.replace(/host\.risk\./g, 'entity.risk.');
  } catch {
    return undefined;
  }
};

/**
 * Builds the base filter for host risk scores from entity store v2.
 * Only returns hosts that have risk data.
 */
const buildEntityStoreRiskFilter = (): string =>
  JSON.stringify({
    bool: {
      filter: [
        { exists: { field: 'entity.risk.calculated_score_norm' } },
        { exists: { field: 'host.name' } },
      ],
    },
  });

/**
 * Merges the entity store risk filter with the transformed user filter.
 */
const mergeFilters = (baseFilter: string, userFilter: string | undefined): string | undefined => {
  if (!userFilter) {
    return baseFilter;
  }
  try {
    const base = JSON.parse(baseFilter) as Record<string, unknown>;
    const user = JSON.parse(userFilter) as Record<string, unknown>;
    return JSON.stringify({
      bool: {
        must: [base, user],
      },
    });
  } catch {
    return baseFilter;
  }
};

const mapEntityToHostRiskScore = (entity: HostEntity): HostRiskScore => {
  const hostName = entity.host?.name ?? (entity.entity?.name as string | undefined) ?? '';
  const risk = entity.entity?.risk ?? entity.host?.risk;
  const timestamp = entity['@timestamp'] ?? '';
  const riskRecord = risk as Partial<RiskStats> | undefined;

  const riskStats: RiskStats = riskRecord
    ? {
        '@timestamp': riskRecord['@timestamp'] ?? new Date().toISOString(),
        id_field: riskRecord.id_field ?? 'host.name',
        id_value: riskRecord.id_value ?? hostName,
        calculated_level: riskRecord.calculated_level ?? 'Unknown',
        calculated_score: riskRecord.calculated_score ?? 0,
        calculated_score_norm: riskRecord.calculated_score_norm ?? 0,
        category_1_score: riskRecord.category_1_score ?? 0,
        category_1_count: riskRecord.category_1_count ?? 0,
        inputs: riskRecord.inputs ?? [],
        notes: riskRecord.notes ?? [],
        rule_risks: riskRecord.rule_risks ?? [],
        multipliers: riskRecord.multipliers ?? [],
      }
    : {
        '@timestamp': new Date().toISOString(),
        id_field: 'host.name',
        id_value: hostName,
        calculated_level: 'Unknown',
        calculated_score: 0,
        calculated_score_norm: 0,
        category_1_score: 0,
        category_1_count: 0,
        inputs: [],
        notes: [],
        rule_risks: [],
        multipliers: [],
      };

  return {
    '@timestamp': Array.isArray(timestamp) ? timestamp[0] : timestamp,
    host: {
      name: hostName,
      risk: riskStats,
    },
  };
};

export interface UseHostRiskScoresFromEntityStoreParams {
  filterQuery?: string;
  pagination: { cursorStart: number; querySize: number };
  sort?: RiskScoreSortField;
  skip?: boolean;
}

export interface UseHostRiskScoresFromEntityStoreResult {
  data: HostRiskScore[];
  totalCount: number;
  loading: boolean;
  refetch: () => void;
  inspect: { dsl: string[]; response: string[]; indexPattern: string[] };
  hasEngineBeenInstalled: boolean;
}

export const useHostRiskScoresFromEntityStore = ({
  filterQuery,
  pagination,
  sort,
  skip = false,
}: UseHostRiskScoresFromEntityStoreParams): UseHostRiskScoresFromEntityStoreResult => {
  const spaceId = useSpaceId();
  const namespace = spaceId ?? 'default';

  const entitySortField = useMemo(() => {
    const field = sort?.field ?? RiskScoreFields.hostRiskScore;
    return RISK_SCORE_TO_ENTITY_STORE_SORT_FIELD[field] ?? 'entity.risk.calculated_score_norm';
  }, [sort?.field]);

  const entityFilterQuery = useMemo(() => {
    const transformed = transformFilterForEntityStore(filterQuery);
    const baseFilter = buildEntityStoreRiskFilter();
    return mergeFilters(baseFilter, transformed);
  }, [filterQuery]);

  const { cursorStart, querySize } = pagination;
  const page = Math.floor(cursorStart / querySize) + 1;

  const { data, isLoading, refetch } = useEntitiesListQuery({
    entityTypes: ['host'],
    page,
    perPage: querySize,
    sortField: entitySortField,
    sortOrder: sort?.direction ?? 'desc',
    filterQuery: entityFilterQuery,
    skip,
  });

  return useMemo(() => {
    const records = data?.records ?? [];
    const hostEntities = records.filter(
      (entity: HostEntity | unknown): entity is HostEntity =>
        entity != null && typeof entity === 'object' && 'host' in entity
    );
    const hostRiskScores = hostEntities.map(mapEntityToHostRiskScore);

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
      data: hostRiskScores,
      totalCount,
      loading: isLoading,
      refetch: refetch as () => void,
      inspect,
      hasEngineBeenInstalled: true,
    };
  }, [data, isLoading, refetch, namespace]);
};
