/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../common/entity_analytics/types';
import {
  EntityIdentifierFields,
  EntityTypeToIdentifierField,
} from '../../../../common/entity_analytics/types';
import type {
  RiskScoresCalculationResponse,
  AssetCriticalityRecord,
} from '../../../../common/api/entity_analytics';
import type {
  AfterKeys,
  EntityAfterKey,
  EntityRiskScoreRecord,
  RiskScoreWeights,
  RiskScoreWeight,
} from '../../../../common/api/entity_analytics/common';
import {
  getRiskLevel,
  RiskCategories,
  RiskWeightTypes,
} from '../../../../common/entity_analytics/risk_engine';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import { applyCriticalityToScore, getCriticalityModifier } from '../asset_criticality/helpers';
import type { CalculateScoresParams, IdentitySourceFieldsMap, RiskScoreBucket } from '../types';
import { RIEMANN_ZETA_VALUE } from './constants';

export const getFieldForIdentifier = (identifierType: EntityType): string =>
  EntityTypeToIdentifierField[identifierType];

/**
 * Internal runtime field name for risk score composite aggregation and ESQL.
 * Using our own name (instead of ECS identity fields like user.entity.id) avoids the
 * Painless script referencing the same field it defines, which causes script_exception
 * in composite aggs. API responses continue to expose normalized `entity.id` for V2.
 */
export const getRiskScoreEntityIdField = (entityType: string): string => `${entityType}_id`;

/**
 * Returns the identifier field used inside queries (composite aggs, ESQL BY clauses).
 * V2 uses a synthetic runtime field; V1 uses the legacy ECS field.
 */
export const getQueryIdentifierField = (
  entityType: EntityType,
  idBasedRiskScoringEnabled: boolean
): string =>
  idBasedRiskScoringEnabled
    ? getRiskScoreEntityIdField(entityType)
    : EntityTypeToIdentifierField[entityType];

/**
 * Returns the identifier field exposed in API responses and stored in risk score documents.
 * V2 normalizes to `entity.id`; V1 uses the per-type ECS field.
 */
export const getOutputIdentifierField = (
  entityType: EntityType,
  idBasedRiskScoringEnabled: boolean
): string =>
  idBasedRiskScoringEnabled
    ? EntityIdentifierFields.generic
    : EntityTypeToIdentifierField[entityType];

export const getAfterKeyForIdentifierType = ({
  afterKeys,
  identifierType,
}: {
  afterKeys: AfterKeys;
  identifierType: EntityType;
}): EntityAfterKey | undefined => afterKeys[identifierType];

export const isRiskScoreCalculationComplete = (result: RiskScoresCalculationResponse): boolean =>
  Object.keys(result.after_keys.host ?? {}).length === 0 &&
  Object.keys(result.after_keys.user ?? {}).length === 0 &&
  Object.keys(result.after_keys.service ?? {}).length === 0;

export const max10DecimalPlaces = (num: number) => Math.round(num * 1e10) / 1e10;

/**
 * Escapes user-controlled values used inside ESQL double-quoted string literals.
 * Keep backslash escaping first to avoid double-escaping inserted escapes.
 */
export const escapeEsqlStringLiteral = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

export const serializeIdentitySourceFields = (
  identitySourceFields: IdentitySourceFieldsMap
): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(identitySourceFields).sort(([left], [right]) => left.localeCompare(right))
    )
  );

export const parseIdentitySourceFields = (
  rawIdentityFields: unknown
): IdentitySourceFieldsMap | undefined => {
  if (typeof rawIdentityFields !== 'string' || rawIdentityFields === '') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawIdentityFields) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as IdentitySourceFieldsMap;
    }
  } catch {
    // Malformed identity payloads should not fail score processing.
  }

  return undefined;
};

export const filterFromRange = (range: CalculateScoresParams['range']): QueryDslQueryContainer => ({
  range: { '@timestamp': { lt: range.end, gte: range.start } },
});

export const getGlobalWeightForIdentifierType = (
  identifierType: EntityType,
  weights?: RiskScoreWeights
): number | undefined =>
  weights?.find((weight: RiskScoreWeight) => weight.type === RiskWeightTypes.global)?.[
    identifierType
  ];

const formatForResponse = ({
  bucket,
  criticality,
  now,
  identifierField,
  includeNewFields,
  globalWeight,
}: {
  bucket: RiskScoreBucket;
  criticality?: AssetCriticalityRecord;
  now: string;
  identifierField: string;
  includeNewFields: boolean;
  globalWeight?: number;
}): EntityRiskScoreRecord => {
  const riskDetails = bucket.top_inputs.risk_details;

  // Apply global weight to the score if provided
  const weightedScore =
    globalWeight !== undefined ? riskDetails.value.score * globalWeight : riskDetails.value.score;
  const weightedNormalizedScore =
    globalWeight !== undefined
      ? riskDetails.value.normalized_score * globalWeight
      : riskDetails.value.normalized_score;

  const criticalityModifier = getCriticalityModifier(criticality?.criticality_level);
  const normalizedScoreWithCriticality = applyCriticalityToScore({
    score: weightedNormalizedScore,
    modifier: criticalityModifier,
  });
  const calculatedLevel = getRiskLevel(normalizedScoreWithCriticality);
  const categoryTwoScore = normalizedScoreWithCriticality - weightedNormalizedScore;
  const categoryTwoCount = criticalityModifier ? 1 : 0;

  const newFields = {
    category_2_score: max10DecimalPlaces(categoryTwoScore),
    category_2_count: categoryTwoCount,
    criticality_level: criticality?.criticality_level,
    criticality_modifier: criticalityModifier,
  };

  return {
    '@timestamp': now,
    id_field: identifierField,
    id_value: bucket.key[identifierField],
    calculated_level: calculatedLevel,
    calculated_score: max10DecimalPlaces(weightedScore),
    calculated_score_norm: max10DecimalPlaces(normalizedScoreWithCriticality),
    category_1_score: max10DecimalPlaces(riskDetails.value.category_1_score / RIEMANN_ZETA_VALUE), // normalize value to be between 0-100
    category_1_count: riskDetails.value.category_1_count,
    notes: riskDetails.value.notes,
    inputs: riskDetails.value.risk_inputs.map((riskInput) => ({
      id: riskInput.id,
      index: riskInput.index,
      description: `Alert from Rule: ${riskInput.rule_name ?? 'RULE_NOT_FOUND'}`,
      category: RiskCategories.category_1,
      risk_score: riskInput.score,
      timestamp: riskInput.time,
      contribution_score: riskInput.contribution,
    })),
    ...(includeNewFields ? newFields : {}),
  };
};

export const processScores = async ({
  assetCriticalityService,
  buckets,
  identifierField,
  logger,
  now,
  identifierType,
  weights,
}: {
  assetCriticalityService: AssetCriticalityService;
  buckets: RiskScoreBucket[];
  identifierField: string;
  logger: Logger;
  now: string;
  identifierType?: EntityType;
  weights?: RiskScoreWeights;
}): Promise<EntityRiskScoreRecord[]> => {
  if (buckets.length === 0) {
    return [];
  }

  const identifiers = buckets.map((bucket) => ({
    id_field: identifierField,
    id_value: bucket.key[identifierField],
  }));

  let criticalities: AssetCriticalityRecord[] = [];
  try {
    criticalities = await assetCriticalityService.getCriticalitiesByIdentifiers(identifiers);
  } catch (e) {
    logger.warn(
      `Error retrieving criticality: ${e}. Scoring will proceed without criticality information.`
    );
  }

  const globalWeight = identifierType
    ? getGlobalWeightForIdentifierType(identifierType, weights)
    : undefined;

  return buckets.map((bucket) => {
    const criticality = criticalities.find(
      (c) => c.id_field === identifierField && c.id_value === bucket.key[identifierField]
    );

    const record: EntityRiskScoreRecord = formatForResponse({
      bucket,
      criticality,
      identifierField,
      now,
      includeNewFields: true,
      globalWeight,
    });

    if (bucket.euid_fields !== undefined) {
      record.euid_fields_raw = serializeIdentitySourceFields(bucket.euid_fields);
    }

    return record;
  });
};
