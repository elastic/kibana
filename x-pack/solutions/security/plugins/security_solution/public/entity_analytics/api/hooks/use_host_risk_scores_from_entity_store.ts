/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostRiskScore, RiskStats } from '../../../../common/search_strategy';
import { RiskScoreFields } from '../../../../common/search_strategy';
import type { HostEntity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import {
  useRiskScoresFromEntityStore,
  type UseRiskScoresFromEntityStoreParams,
  type UseRiskScoresFromEntityStoreResult,
} from './use_risk_scores_from_entity_store';

/**
 * Maps RiskScoreFields (old risk index) to entity store v2 field names.
 * Entity store v2 uses entity.risk.* for all entity types.
 */
const HOST_RISK_SCORE_TO_ENTITY_STORE_SORT_FIELD: Record<string, string> = {
  [RiskScoreFields.timestamp]: '@timestamp',
  [RiskScoreFields.hostName]: 'host.name',
  [RiskScoreFields.hostRiskScore]: 'entity.risk.calculated_score_norm',
  [RiskScoreFields.hostRisk]: 'entity.risk.calculated_level',
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

const HOST_RISK_SCORES_CONFIG = {
  entityType: 'host' as const,
  fieldPrefix: 'host' as const,
  sortFieldMapping: HOST_RISK_SCORE_TO_ENTITY_STORE_SORT_FIELD,
  defaultSortField: RiskScoreFields.hostRiskScore,
  entityKey: 'host' as const,
  mapEntityToRiskScore: mapEntityToHostRiskScore,
};

export type UseHostRiskScoresFromEntityStoreParams = UseRiskScoresFromEntityStoreParams;

export type UseHostRiskScoresFromEntityStoreResult =
  UseRiskScoresFromEntityStoreResult<HostRiskScore>;

export const useHostRiskScoresFromEntityStore = ({
  filterQuery,
  pagination,
  sort,
  skip = false,
}: UseHostRiskScoresFromEntityStoreParams): UseHostRiskScoresFromEntityStoreResult => {
  return useRiskScoresFromEntityStore(HOST_RISK_SCORES_CONFIG, {
    filterQuery,
    pagination,
    sort,
    skip,
  });
};
