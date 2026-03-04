/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import type { EntityRiskScore, RiskStats } from '../../../../common/search_strategy';
import type { EntityStoreRecord } from './hooks/use_entity_from_store';

export function getRiskFromEntityRecord(record: EntityStoreRecord): {
  calculated_level?: string;
  calculated_score?: number;
  calculated_score_norm?: number;
} | null {
  return getRiskFromRecord(record);
}

function getRiskFromRecord(record: EntityStoreRecord): {
  calculated_level?: string;
  calculated_score?: number;
  calculated_score_norm?: number;
} | null {
  const entityRisk = record.entity?.risk;
  if (entityRisk) {
    return {
      calculated_level: entityRisk.calculated_level,
      calculated_score: entityRisk.calculated_score,
      calculated_score_norm: entityRisk.calculated_score_norm,
    };
  }
  if ('host' in record && record.host?.risk) {
    return {
      calculated_level: record.host.risk.calculated_level,
      calculated_score: record.host.risk.calculated_score,
      calculated_score_norm: record.host.risk.calculated_score_norm,
    };
  }
  if ('user' in record && record.user?.risk) {
    return {
      calculated_level: record.user.risk.calculated_level,
      calculated_score: record.user.risk.calculated_score,
      calculated_score_norm: record.user.risk.calculated_score_norm,
    };
  }
  if ('service' in record && record.service?.risk) {
    return {
      calculated_level: record.service.risk.calculated_level,
      calculated_score: record.service.risk.calculated_score,
      calculated_score_norm: record.service.risk.calculated_score_norm,
    };
  }
  return null;
}

function getEntityNameFromRecord(record: EntityStoreRecord, entityType: EntityType): string {
  if (entityType === 'host' && 'host' in record) return record.host?.name ?? '';
  if (entityType === 'user' && 'user' in record) return record.user?.name ?? '';
  if (entityType === 'service' && 'service' in record) return record.service?.name ?? '';
  return '';
}

/**
 * Build a minimal RiskStats from entity store risk fields (for flyout display).
 */
function buildMinimalRiskStats(
  risk: {
    calculated_level?: string;
    calculated_score?: number;
    calculated_score_norm?: number;
  } | null,
  timestamp: string,
  idField: string,
  idValue: string
): RiskStats {
  return {
    '@timestamp': timestamp,
    id_field: idField,
    id_value: idValue,
    calculated_level: (risk?.calculated_level ?? 'Unknown') as RiskStats['calculated_level'],
    calculated_score: risk?.calculated_score ?? 0,
    calculated_score_norm: risk?.calculated_score_norm ?? 0,
    category_1_score: 0,
    category_1_count: 0,
    inputs: [],
    notes: [],
    rule_risks: [],
    multipliers: [],
  };
}

/**
 * Build RiskScoreState for the flyout from an entity store record (when FF_ENABLE_ENTITY_STORE_V2).
 */
export function buildRiskScoreStateFromEntityRecord<T extends EntityType>(
  entityType: T,
  record: EntityStoreRecord,
  options: {
    refetch: () => void;
    isLoading: boolean;
    error: unknown;
  }
): RiskScoreState<T> {
  const timestamp = record['@timestamp'] ?? new Date().toISOString();
  const name = getEntityNameFromRecord(record, entityType);
  const riskFromRecord = getRiskFromRecord(record);
  const idField =
    entityType === 'host' ? 'host.name' : entityType === 'user' ? 'user.name' : 'service.name';
  const riskStats = buildMinimalRiskStats(riskFromRecord, timestamp, idField, name);

  const dataItem = {
    '@timestamp': timestamp,
    [entityType]: { name, risk: riskStats },
  } as unknown as EntityRiskScore<T>;

  return {
    data: [dataItem] as RiskScoreState<T>['data'],
    inspect: { dsl: [], response: [] },
    isInspected: false,
    refetch: options.refetch,
    totalCount: 1,
    isAuthorized: true,
    hasEngineBeenInstalled: true,
    loading: options.isLoading,
    error: options.error,
  };
}
