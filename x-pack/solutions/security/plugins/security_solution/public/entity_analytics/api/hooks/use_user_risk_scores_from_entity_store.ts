/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskStats, UserRiskScore } from '../../../../common/search_strategy';
import { RiskScoreFields } from '../../../../common/search_strategy';
import type { UserEntity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import {
  useRiskScoresFromEntityStore,
  type UseRiskScoresFromEntityStoreParams,
  type UseRiskScoresFromEntityStoreResult,
} from './use_risk_scores_from_entity_store';

/**
 * Maps RiskScoreFields (old risk index) to entity store v2 field names.
 * Entity store v2 uses entity.risk.* for all entity types.
 */
const USER_RISK_SCORE_TO_ENTITY_STORE_SORT_FIELD: Record<string, string> = {
  [RiskScoreFields.timestamp]: '@timestamp',
  [RiskScoreFields.userName]: 'user.name',
  [RiskScoreFields.userRiskScore]: 'entity.risk.calculated_score_norm',
  [RiskScoreFields.userRisk]: 'entity.risk.calculated_level',
};

const mapEntityToUserRiskScore = (entity: UserEntity): UserRiskScore => {
  const userName = entity.user?.name ?? (entity.entity?.name as string | undefined) ?? '';
  const risk = entity.entity?.risk ?? entity.user?.risk;
  const timestamp = entity['@timestamp'] ?? '';
  const riskRecord = risk as Partial<RiskStats> | undefined;

  const riskStats: RiskStats = riskRecord
    ? {
        '@timestamp': riskRecord['@timestamp'] ?? new Date().toISOString(),
        id_field: riskRecord.id_field ?? 'user.name',
        id_value: riskRecord.id_value ?? userName,
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
        id_field: 'user.name',
        id_value: userName,
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
    user: {
      name: userName,
      risk: riskStats,
    },
  };
};

const USER_RISK_SCORES_CONFIG = {
  entityType: 'user' as const,
  fieldPrefix: 'user' as const,
  sortFieldMapping: USER_RISK_SCORE_TO_ENTITY_STORE_SORT_FIELD,
  defaultSortField: RiskScoreFields.userRiskScore,
  entityKey: 'user' as const,
  mapEntityToRiskScore: mapEntityToUserRiskScore,
};

export type UseUserRiskScoresFromEntityStoreParams = UseRiskScoresFromEntityStoreParams;

export type UseUserRiskScoresFromEntityStoreResult =
  UseRiskScoresFromEntityStoreResult<UserRiskScore>;

export const useUserRiskScoresFromEntityStore = ({
  filterQuery,
  pagination,
  sort,
  skip = false,
}: UseUserRiskScoresFromEntityStoreParams): UseUserRiskScoresFromEntityStoreResult => {
  return useRiskScoresFromEntityStore(USER_RISK_SCORES_CONFIG, {
    filterQuery,
    pagination,
    sort,
    skip,
  });
};
