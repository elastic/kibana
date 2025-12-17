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
import { getCriticalityModifier } from '../../asset_criticality/helpers';
import type { Modifier } from './types';

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

    return buildModifier(criticality, globalWeight);
  });
};

const buildModifier = (
  criticality?: AssetCriticalityRecord,
  globalWeight?: number
): Modifier<'asset_criticality'> | undefined => {
  const criticalityModifier = getCriticalityModifier(criticality?.criticality_level);
  if (!criticality || !criticalityModifier) {
    return;
  }

  const weightedModifier =
    globalWeight !== undefined ? criticalityModifier * globalWeight : criticalityModifier;

  return {
    type: 'asset_criticality',
    modifier_value: weightedModifier,
    metadata: {
      criticality_level: criticality?.criticality_level,
    },
  };
};

export const buildLegacyCriticalityFields = (
  modifier?: Modifier<'asset_criticality'> & { contribution: number }
): AssetCriticalityRiskFields => {
  if (!modifier?.metadata?.criticality_level) {
    return {
      category_2_score: 0,
      category_2_count: 0,
    };
  }
  return {
    criticality_level: modifier.metadata?.criticality_level,
    criticality_modifier: modifier.modifier_value,
    category_2_score: modifier?.contribution ?? 0,
    category_2_count: 1,
  };
};
