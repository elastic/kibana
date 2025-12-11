/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import _ from 'lodash';

import type { EntityType } from '../../../../common/entity_analytics/types';

import type {
  EntityRiskScoreRecord,
  RiskScoreWeights,
} from '../../../../common/api/entity_analytics/common';
import { getRiskLevel, RiskCategories } from '../../../../common/entity_analytics/risk_engine';
import type { AssetCriticalityService } from '../asset_criticality';

import type { PrivmonUserCrudService } from '../privilege_monitoring/users/privileged_users_crud';

import type { RiskScoreBucket } from '../types';
import { RIEMANN_ZETA_VALUE } from './constants';
import { getGlobalWeightForIdentifierType, max10DecimalPlaces } from './helpers';
import type { AssetCriticalityRiskFields } from './modifiers/asset_criticality';
import { applyCriticalityModifier } from './modifiers/asset_criticality';
import type { PrivmonRiskFields } from './modifiers/privileged_users';
import { applyPrivmonModifier } from './modifiers/privileged_users';
import type { ExperimentalFeatures } from '../../../../common';
interface ModifiersUpdateParams {
  now: string;
  deps: {
    privmonUserCrudService: PrivmonUserCrudService;
    assetCriticalityService: AssetCriticalityService;
    logger: Logger;
  };

  page: {
    buckets: RiskScoreBucket[];
    bounds: {
      lower?: string;
      upper?: string;
    };
    identifierField: string;
  };
  weights?: RiskScoreWeights;
  identifierType?: EntityType;
  experimentalFeatures: ExperimentalFeatures;
}

export const applyScoreModifiers = async ({
  now,
  identifierType,
  deps,
  weights,
  page,
  experimentalFeatures,
}: ModifiersUpdateParams): Promise<EntityRiskScoreRecord[]> => {
  const globalWeight = identifierType
    ? getGlobalWeightForIdentifierType(identifierType, weights)
    : undefined;

  const modifierPromises = [
    applyCriticalityModifier({
      page,
      globalWeight,
      deps: _.pick(deps, ['assetCriticalityService', 'logger']),
    }),

    applyPrivmonModifier({
      page,
      globalWeight,
      experimentalFeatures,
      deps: _.pick(deps, ['privmonUserCrudService', 'logger']),
    }),
  ] as const;

  const [criticality, privmon] = await Promise.all(modifierPromises);

  return _.zipWith(
    page.buckets,
    criticality,
    privmon,
    riskScoreDocFactory({ now, identifierField: page.identifierField, globalWeight })
  );
};

interface RiskScoreDocFactoryParams {
  now: string;
  identifierField: string;
  globalWeight?: number;
}

export const riskScoreDocFactory =
  ({ now, identifierField, globalWeight = 1 }: RiskScoreDocFactoryParams) =>
  (
    bucket: RiskScoreBucket,
    criticalityFields: AssetCriticalityRiskFields,
    privmonFields: PrivmonRiskFields
  ): EntityRiskScoreRecord => {
    const risk = bucket.top_inputs.risk_details;

    const alertsRiskScoreFields = {
      category_1_score: max10DecimalPlaces(risk.value.category_1_score / RIEMANN_ZETA_VALUE), // normalize value to be between 0-100
      category_1_count: risk.value.category_1_count,
    };

    const totalScoreWithModifiers =
      risk.value.normalized_score * globalWeight +
      criticalityFields.category_2_score +
      privmonFields.category_3_score;

    const weightedScore =
      globalWeight !== undefined ? risk.value.score * globalWeight : risk.value.score;
    const finalRiskScoreFields = {
      calculated_level: getRiskLevel(totalScoreWithModifiers),
      calculated_score: max10DecimalPlaces(weightedScore),
      calculated_score_norm: max10DecimalPlaces(totalScoreWithModifiers),
    };

    return {
      '@timestamp': now,
      id_field: identifierField,
      id_value: bucket.key[identifierField],
      ...finalRiskScoreFields,
      ...alertsRiskScoreFields,
      ...criticalityFields,
      ...privmonFields,
      notes: risk.value.notes,
      inputs: risk.value.risk_inputs.map((riskInput) => ({
        id: riskInput.id,
        index: riskInput.index,
        description: `Alert from Rule: ${riskInput.rule_name ?? 'RULE_NOT_FOUND'}`,
        category: RiskCategories.category_1,
        risk_score: riskInput.score,
        timestamp: riskInput.time,
        contribution_score: riskInput.contribution,
      })),
    };
  };
