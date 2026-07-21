/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitySummaryStalenessEntitySnapshot } from '@kbn/entity-store/common';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskScoreState } from '../../../entity_analytics/api/hooks/use_risk_score';
import type { EntityRiskScore, RiskStats } from '../../../../common/search_strategy';
import { getRiskLevel } from '../../../../common/entity_analytics/risk_engine/risk_levels';
import type { EntityStoreRecord } from './hooks/use_entity_from_store';

type EntityRiskFields = {
  calculated_level?: string;
  calculated_score?: number;
  calculated_score_norm?: number;
};

/**
 * Entity Store v2 documents often materialize only `calculated_score_norm`
 * (the risk maintainer may not have written `calculated_level` yet). Derive
 * the missing fields so flyout badges / Lens subtitles match the Entities
 * table, which already derives level from the norm via `getRiskLevel`.
 */
const enrichEntityRiskFields = (
  risk: EntityRiskFields | null | undefined
): EntityRiskFields | null => {
  if (risk == null) {
    return null;
  }
  const norm = risk.calculated_score_norm;
  const level =
    risk.calculated_level ??
    (typeof norm === 'number' && Number.isFinite(norm) ? getRiskLevel(norm) : undefined);
  return {
    calculated_level: level,
    calculated_score: risk.calculated_score ?? norm ?? 0,
    calculated_score_norm: norm,
  };
};

export function getRiskFromEntityRecord(record: EntityStoreRecord): EntityRiskFields | null {
  return getRiskFromRecord(record);
}

/** Current entity signals used for AI summary staleness checks. */
export function buildEntitySummaryStalenessEntitySnapshot(
  record?: EntityStoreRecord | null
): EntitySummaryStalenessEntitySnapshot {
  const risk = record ? getRiskFromEntityRecord(record) : null;
  return {
    // Matches flyout risk summary (`entity.risk.calculated_score_norm`), not raw calculated_score.
    riskScoreNorm: risk?.calculated_score_norm ?? null,
  };
}

function getResolutionRiskFromRecord(record: EntityStoreRecord): EntityRiskFields | null {
  const resolutionRisk = (
    record.entity as { relationships?: { resolution?: { risk?: EntityRiskFields } } } | undefined
  )?.relationships?.resolution?.risk;
  return enrichEntityRiskFields(resolutionRisk ?? null);
}

function getRiskFromRecord(record: EntityStoreRecord): EntityRiskFields | null {
  const entityRisk = record.entity?.risk;
  if (entityRisk) {
    return enrichEntityRiskFields(entityRisk);
  }
  if ('host' in record && record.host) {
    const hostRisk = record.host.risk ?? (record.host as { entity?: { risk?: EntityRiskFields } }).entity?.risk;
    if (hostRisk) {
      return enrichEntityRiskFields(hostRisk);
    }
  }
  if ('user' in record && record.user) {
    const userRisk = record.user.risk ?? (record.user as { entity?: { risk?: EntityRiskFields } }).entity?.risk;
    if (userRisk) {
      return enrichEntityRiskFields(userRisk);
    }
  }
  if ('service' in record && record.service) {
    const serviceRisk =
      record.service.risk ??
      (record.service as { entity?: { risk?: EntityRiskFields } }).entity?.risk;
    if (serviceRisk) {
      return enrichEntityRiskFields(serviceRisk);
    }
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
 * Extract asset criticality level from an entity store record (host/user/service).
 * Used to populate Risk Summary asset criticality row when entity store is the data source.
 */
function getAssetCriticalityFromEntityRecord(record: EntityStoreRecord): string | undefined {
  if ('asset' in record && record.asset?.criticality) {
    return record.asset.criticality;
  }
  return undefined;
}

/**
 * Build a minimal RiskStats from entity store risk fields (for flyout display).
 * When asset criticality is present on the record, adds modifiers and category_2_score
 * so FlyoutRiskSummaryComponent shows a non-zero value for the Asset Criticality row.
 *
 * Prototype note: real risk scores are alert-based with criticality/watchlists as
 * modifiers. When the entity store only has a total norm (no category breakdown),
 * invent an alerts contribution so we never show a score with alerts at 0.
 */
function buildMinimalRiskStats(
  risk: EntityRiskFields | null,
  timestamp: string,
  idField: string,
  idValue: string,
  assetCriticalityLevel?: string
): RiskStats {
  const totalNorm = risk?.calculated_score_norm ?? 0;
  const hasCriticality = assetCriticalityLevel != null;
  // Prototype: keep a small fixed criticality contribution (matches prior flyout
  // display). The remainder is alerts — real engine scores are alert-based.
  const criticalityContribution = hasCriticality && totalNorm > 0 ? 1 : 0;
  const alertsScore =
    totalNorm > 0
      ? Math.max(0.01, Math.round((totalNorm - criticalityContribution) * 100) / 100)
      : 0;
  const alertCount = alertsScore > 0 ? Math.max(1, Math.ceil(alertsScore / 20)) : 0;

  const modifiers = hasCriticality
    ? [
        {
          type: 'asset_criticality' as const,
          contribution: totalNorm > 0 ? criticalityContribution : 0,
          metadata: { criticality_level: assetCriticalityLevel },
        },
      ]
    : undefined;

  return {
    '@timestamp': timestamp,
    id_field: idField,
    id_value: idValue,
    calculated_level: (risk?.calculated_level ?? 'Unknown') as RiskStats['calculated_level'],
    calculated_score: risk?.calculated_score ?? 0,
    calculated_score_norm: totalNorm,
    category_1_score: alertsScore,
    category_1_count: alertCount,
    category_2_score: hasCriticality ? (totalNorm > 0 ? criticalityContribution : 0) : undefined,
    inputs: [],
    notes: [],
    rule_risks: [],
    multipliers: [],
    ...(modifiers && { modifiers }),
  };
}

/**
 * Build RiskScoreState for the flyout from an entity store record.
 * When inspect is provided (e.g. from entity store API response), the Risk Summary inspect button will be enabled.
 */
export function buildRiskScoreStateFromEntityRecord<T extends EntityType>(
  entityType: T,
  record: EntityStoreRecord,
  options: {
    refetch: () => void;
    isLoading: boolean;
    error: unknown;
    /** Entity store API inspect so the Risk Summary Table inspect button is clickable. */
    inspect?: { dsl: string[]; response: string[] };
  }
): RiskScoreState<T> {
  const timestamp = record['@timestamp'] ?? new Date().toISOString();
  const name = getEntityNameFromRecord(record, entityType);
  const riskFromRecord = getRiskFromRecord(record);
  const assetCriticalityLevel = getAssetCriticalityFromEntityRecord(record);
  const idField =
    entityType === 'host' ? 'host.name' : entityType === 'user' ? 'user.name' : 'service.name';
  const riskStats = buildMinimalRiskStats(
    riskFromRecord,
    timestamp,
    idField,
    name,
    assetCriticalityLevel
  );

  const dataItem = {
    '@timestamp': timestamp,
    [entityType]: { name, risk: riskStats },
  } as unknown as EntityRiskScore<T>;

  const inspect =
    options.inspect?.dsl?.length && options.inspect?.response?.length
      ? options.inspect
      : { dsl: [] as string[], response: [] as string[] };

  return {
    data: [dataItem] as RiskScoreState<T>['data'],
    inspect,
    isInspected: false,
    refetch: options.refetch,
    totalCount: 1,
    isAuthorized: true,
    hasEngineBeenInstalled: true,
    loading: options.isLoading,
    error: options.error,
  };
}

/**
 * Builds a resolution-group risk score row from the entity store record's
 * `entity.relationships.resolution.risk` summary (same source the Entities
 * table uses for the Resolution risk column).
 */
export function buildResolutionRiskScoreFromEntityRecord<T extends EntityType>(
  entityType: T,
  record: EntityStoreRecord
): EntityRiskScore<T> | undefined {
  const resolutionRisk = getResolutionRiskFromRecord(record);
  if (resolutionRisk?.calculated_score_norm == null) {
    return undefined;
  }

  const timestamp = record['@timestamp'] ?? new Date().toISOString();
  const name = getEntityNameFromRecord(record, entityType);
  const idField =
    entityType === 'host' ? 'host.name' : entityType === 'user' ? 'user.name' : 'service.name';
  const riskStats = buildMinimalRiskStats(resolutionRisk, timestamp, idField, name);

  return {
    '@timestamp': timestamp,
    [entityType]: { name, risk: riskStats },
  } as unknown as EntityRiskScore<T>;
}

const riskScoreNorm = <T extends EntityType>(
  entityType: T,
  riskData: EntityRiskScore<T> | undefined
): number | undefined => {
  const entity = riskData?.[entityType] as { risk?: { calculated_score_norm?: number } } | undefined;
  const norm = entity?.risk?.calculated_score_norm;
  return typeof norm === 'number' && Number.isFinite(norm) ? norm : undefined;
};

/**
 * Picks the richer of a risk-index row vs an entity-store fallback. Entity
 * Store v2 is authoritative when the risk index still holds a stale zero
 * (common on dev clusters before the maintainer backfills).
 */
export const preferEntityStoreRiskScore = <T extends EntityType>(
  entityType: T,
  riskIndexRow: EntityRiskScore<T> | undefined,
  entityStoreRow: EntityRiskScore<T> | undefined
): EntityRiskScore<T> | undefined => {
  if (entityStoreRow == null) {
    return riskIndexRow;
  }
  if (riskIndexRow == null) {
    return entityStoreRow;
  }
  const indexNorm = riskScoreNorm(entityType, riskIndexRow) ?? 0;
  const storeNorm = riskScoreNorm(entityType, entityStoreRow) ?? 0;
  if (storeNorm > 0 && (indexNorm === 0 || storeNorm > indexNorm)) {
    return entityStoreRow;
  }
  return riskIndexRow;
};

export const ENTITY_STORE_RESOLUTION_RISK_SCORE_FIELD =
  'entity.relationships.resolution.risk.calculated_score_norm';
