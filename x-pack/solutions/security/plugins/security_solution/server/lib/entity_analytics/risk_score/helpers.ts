/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
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
import type { CalculateScoresParams, RiskScoreBucket } from '../types';
import { RIEMANN_ZETA_VALUE } from './constants';

export const getFieldForIdentifier = (identifierType: EntityType): string =>
  EntityTypeToIdentifierField[identifierType];

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

    return formatForResponse({
      bucket,
      criticality,
      identifierField,
      now,
      includeNewFields: true,
      globalWeight,
    });
  });
};
