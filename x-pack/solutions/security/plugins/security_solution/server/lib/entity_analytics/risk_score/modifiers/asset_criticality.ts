/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { AssetCriticalityRecord } from '../../../../../common/api/entity_analytics';
import type { RiskScoreBucket } from '../../types';

import type { AssetCriticalityService } from '../../asset_criticality';
import { max10DecimalPlaces } from '../helpers';
import { bayesianUpdate, getCriticalityModifier } from '../../asset_criticality/helpers';

export interface AssetCriticalityRiskFields {
  category_2_score: number;
  category_2_count: number;
  criticality_level?: AssetCriticalityRecord['criticality_level'];
  criticality_modifier?: number;
}

interface ApplyCriticalityModifierParams {
  page: {
    buckets: RiskScoreBucket[];
    identifierField: string;
  };
  deps: {
    assetCriticalityService: AssetCriticalityService;
    logger: Logger;
  };
  globalWeight?: number;
}

export const applyCriticalityModifier = async ({
  page,
  deps,
  globalWeight,
}: ApplyCriticalityModifierParams) => {
  if (page.buckets.length === 0) {
    return [];
  }
  const identifiers = page.buckets.map((bucket) => ({
    id_field: page.identifierField,
    id_value: bucket.key[page.identifierField],
  }));

  const criticalities = await deps.assetCriticalityService
    .getCriticalitiesByIdentifiers(identifiers)
    .catch((error) => {
      deps.logger.warn(
        `Error retrieving criticality: ${error}. Scoring will proceed without criticality information.`
      );
      return [];
    });

  return page.buckets.map((bucket) => {
    const criticality = criticalities.find(
      (c) => c.id_field === page.identifierField && c.id_value === bucket.key[page.identifierField]
    );

    return calculateScoreAndContributions(
      bucket.top_inputs.risk_details.value.normalized_score,
      criticality,
      globalWeight
    );
  });
};

const calculateScoreAndContributions = (
  normalizedBaseScore: number,
  criticality?: AssetCriticalityRecord,
  globalWeight?: number
): AssetCriticalityRiskFields => {
  const criticalityModifier = getCriticalityModifier(criticality?.criticality_level);
  if (!criticalityModifier) {
    return {
      category_2_score: 0,
      category_2_count: 0,
    };
  }

  const weightedNormalizedScore =
    globalWeight !== undefined ? normalizedBaseScore * globalWeight : normalizedBaseScore;

  const updatedNormalizedScore = bayesianUpdate({
    modifier: criticalityModifier,
    score: weightedNormalizedScore,
  });

  const contribution = updatedNormalizedScore - weightedNormalizedScore;

  return {
    category_2_score: max10DecimalPlaces(contribution),
    category_2_count: 1, // modifier exists, so count as 1
    criticality_level: criticality?.criticality_level,
    criticality_modifier: criticalityModifier,
  };
};
