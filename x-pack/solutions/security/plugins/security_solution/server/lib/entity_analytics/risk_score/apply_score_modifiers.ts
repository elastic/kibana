/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import _ from 'lodash';

import { isDefined } from '../../../../common/utils/nullable';
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

import {
  applyCriticalityModifier,
  buildLegacyCriticalityFields,
} from './modifiers/asset_criticality';

// import { applyPrivmonModifier } from './modifiers/privileged_users';
import type { ExperimentalFeatures } from '../../../../common';
import type { Modifier } from './modifiers/types';
import { bayesianUpdate } from '../asset_criticality/helpers';
import { applyWatchlistModifiers } from './modifiers/watchlists_modifiers';
import type { WatchlistConfigClient } from '../watchlists/management/watchlist_config';
import type { WatchlistEntitiesService } from '../watchlists/entities/service';
interface ModifiersUpdateParams {
  now: string;
  deps: {
    privmonUserCrudService: PrivmonUserCrudService;
    watchlistConfigClient: WatchlistConfigClient;
    watchlistEntitiesService: WatchlistEntitiesService;
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

  const watchlistPromises = await applyWatchlistModifiers({
    page,
    globalWeight,
    deps: {
      watchlistConfigClient: deps.watchlistConfigClient,
      watchlistEntityService: deps.watchlistEntitiesService,
      logger: deps.logger,
    },
    experimentalFeatures,
  });

  const modifierPromises = [
    applyCriticalityModifier({
      page,
      globalWeight,
      deps: _.pick(deps, ['assetCriticalityService', 'logger']),
    }),

    //
    ...watchlistPromises,
  ] as const;

  const [criticality, ...watchlists] = await Promise.all(modifierPromises);
  const fn = riskScoreDocFactory({ now, identifierField: page.identifierField, globalWeight });

  const zip = (
    result: EntityRiskScoreRecord[],
    buckets: RiskScoreBucket[],
    crits: Array<Modifier<'asset_criticality'> | undefined>,
    ...lists: Array<Modifier<'watchlist'> | undefined>[]
  ) => {
    if (buckets.length === 0) return result;

    const [bucket, ...bs] = buckets;
    const [crit, ...cs] = crits;
    const ws = lists.map(([w]) => w);
    const tails = lists.map(([, ...rest]) => rest);

    const doc = fn(bucket, crit, ...ws);
    result.push(doc);
    return zip(result, bs, cs, ...tails);
  };
  return zip([], page.buckets, criticality, ...watchlists);
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
    criticalityModifierFields: Modifier<'asset_criticality'> | undefined,
    ...watchlistsModifierFields: Array<Modifier<'watchlist'> | undefined>
  ): EntityRiskScoreRecord => {
    const risk = bucket.top_inputs.risk_details;

    const alertsRiskScoreFields = {
      category_1_score: max10DecimalPlaces(risk.value.category_1_score / RIEMANN_ZETA_VALUE), // normalize value to be between 0-100
      category_1_count: risk.value.category_1_count,
    };

    const totalModifier =
      (criticalityModifierFields?.modifier_value ?? 1) *
      watchlistsModifierFields.reduce((acc, curr) => acc * (curr?.modifier_value ?? 1), 1);
    //
    //  (watchlistsModifierFields?.modifier_value ?? 1);

    const originalScore = risk.value.normalized_score * globalWeight;
    const totalScoreWithModifiers = bayesianUpdate({
      modifier: totalModifier,
      score: originalScore,
    });

    const weightedScore =
      globalWeight !== undefined ? risk.value.score * globalWeight : risk.value.score;
    const finalRiskScoreFields = {
      calculated_level: getRiskLevel(totalScoreWithModifiers),
      calculated_score: max10DecimalPlaces(weightedScore),
      calculated_score_norm: max10DecimalPlaces(totalScoreWithModifiers),
    };

    const appliedModifiers = [criticalityModifierFields, ...watchlistsModifierFields].filter(
      isDefined
    );

    const getContribution = getProportionalModifierContribution(
      appliedModifiers.map((modifier) => modifier.modifier_value ?? 1),
      originalScore,
      totalScoreWithModifiers
    );

    type DocModifier = NonNullable<EntityRiskScoreRecord['modifiers']>[number];
    const modifiers = appliedModifiers.map<DocModifier>((modifier) => ({
      ...modifier,
      contribution: max10DecimalPlaces(getContribution(modifier.modifier_value ?? 1)),
    }));

    const found = modifiers.find((mod) => mod.type === 'asset_criticality') as
      | (Modifier<'asset_criticality'> & { contribution: number })
      | undefined;

    const legacyCat2Fields = buildLegacyCriticalityFields(found);

    return {
      '@timestamp': now,
      id_field: identifierField,
      id_value: bucket.key[identifierField],
      ...finalRiskScoreFields,
      ...alertsRiskScoreFields,
      ...legacyCat2Fields,
      modifiers,
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

const getProportionalModifierContribution =
  (allModifiers: number[], originalScore: number, finalScore: number) => (modifier: number) => {
    // This converts the modifiers to Log-Odds, transforming non-linear multiplication into linear addition, allowing us to measure the force of the change.
    const modifierWeight = Math.log(modifier);
    const combinedWeight = allModifiers
      .map((each) => Math.log(each))
      .reduce((sum, next) => sum + next, 0);

    const combinedWeightIsEffectivelyZero = Math.abs(combinedWeight) < 0.0001;

    const scalingFactor = combinedWeightIsEffectivelyZero
      ? // If the combined weight is 0, we can't divide by it. In this case, we use the slope.
        (originalScore * (100 - originalScore)) / 100
      : // If the combined weight is not 0, we distribute the actual score change.
        (finalScore - originalScore) / combinedWeight;

    return scalingFactor * modifierWeight;
  };
