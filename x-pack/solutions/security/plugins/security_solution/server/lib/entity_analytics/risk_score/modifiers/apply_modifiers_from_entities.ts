/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreModifierEntity } from '../maintainer/steps/pipeline_types';

import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import type {
  EntityRiskScoreRecord,
  RiskScoreWeights,
} from '../../../../../common/api/entity_analytics/common';
import { bayesianUpdate, getCriticalityModifier } from '../../asset_criticality/helpers';
import type { Modifier } from './types';
import { getGlobalWeightForIdentifierType, max10DecimalPlaces } from '../helpers';
import type { ParsedRiskScore } from '../maintainer/steps/parse_esql_row';
import { getRiskLevel, RiskCategories } from '../../../../../common/entity_analytics/risk_engine';
import { buildLegacyCriticalityFields } from './asset_criticality';
import { RIEMANN_ZETA_VALUE } from '../constants';
import { isDefined } from '../../../../../common/utils/nullable';

/**
 * Extracts modifier metadata from a pre-fetched Entity document.
 *
 * Returns a tuple of [criticalityModifier, watchlistModifiers],
 * where watchlistModifiers is an array (one per matching watchlist).
 */
export const extractModifiersFromEntity = (
  entity: RiskScoreModifierEntity | undefined,
  globalWeight?: number,
  watchlistConfigs?: Map<string, WatchlistObject>
): [Modifier<'asset_criticality'> | undefined, Array<Modifier<'watchlist'>>] => {
  const criticalityModifier = buildCriticalityModifier(entity, globalWeight);
  const watchlistModifiers = buildWatchlistModifiers(entity, globalWeight, watchlistConfigs);
  return [criticalityModifier, watchlistModifiers];
};

const buildCriticalityModifier = (
  entity: RiskScoreModifierEntity | undefined,
  globalWeight?: number
): Modifier<'asset_criticality'> | undefined => {
  const criticalityLevel = entity?.asset?.criticality;
  const modifier = getCriticalityModifier(criticalityLevel);
  if (modifier == null) {
    return undefined;
  }

  const weightedModifier = globalWeight !== undefined ? modifier * globalWeight : modifier;

  return {
    type: 'asset_criticality',
    modifier_value: weightedModifier,
    metadata: {
      criticality_level: criticalityLevel,
    },
  };
};

const buildWatchlistModifiers = (
  entity: RiskScoreModifierEntity | undefined,
  globalWeight?: number,
  watchlistConfigs?: Map<string, WatchlistObject>
): Array<Modifier<'watchlist'>> => {
  const rawWatchlistIds = entity?.entity?.attributes?.watchlists;
  const watchlistIds = Array.isArray(rawWatchlistIds)
    ? rawWatchlistIds.filter(
        (watchlistId): watchlistId is string => typeof watchlistId === 'string'
      )
    : typeof rawWatchlistIds === 'string'
    ? [rawWatchlistIds]
    : [];
  if (watchlistIds.length === 0 || !watchlistConfigs) {
    return [];
  }

  return watchlistIds.reduce<Array<Modifier<'watchlist'>>>((acc, watchlistId) => {
    const config = watchlistConfigs.get(watchlistId);
    if (config) {
      const isPrivmonWatchlist = config.name === 'privmon' || config.name === 'privileged_users';
      const modifierValue = config.riskModifier;
      const weightedModifier =
        globalWeight !== undefined ? modifierValue * globalWeight : modifierValue;

      acc.push({
        type: 'watchlist',
        subtype: isPrivmonWatchlist ? 'privmon' : config.name,
        modifier_value: weightedModifier,
        metadata: {
          watchlist_id: watchlistId,
          ...(isPrivmonWatchlist ? { is_privileged_user: true } : {}),
        },
      });
    }
    return acc;
  }, []);
};

interface ApplyModifiersFromEntitiesParams {
  now: string;
  identifierType?: EntityType;
  scoreType?: NonNullable<EntityRiskScoreRecord['score_type']>;
  calculationRunId?: string;
  weights?: RiskScoreWeights;
  page: {
    scores: ParsedRiskScore[];
    identifierField: string;
  };
  entities: Map<string, RiskScoreModifierEntity>;
  watchlistConfigs?: Map<string, WatchlistObject>;
}

/**
 * Applies score modifiers sourced from pre-fetched Entity Store documents.
 *
 * This replaces the legacy `applyScoreModifiers` for the V2 maintainer path.
 * Instead of querying asset criticality and privileged user indices separately,
 * it reads modifier metadata directly from entity documents.
 */
export const applyScoreModifiersFromEntities = ({
  now,
  identifierType,
  scoreType = 'base',
  calculationRunId,
  weights,
  page,
  entities,
  watchlistConfigs,
}: ApplyModifiersFromEntitiesParams) => {
  const { scores } = page;

  const globalWeight = identifierType
    ? getGlobalWeightForIdentifierType(identifierType, weights)
    : undefined;

  const modifiers = scores.map((score) => {
    const entityId = score.entity_id;
    const entity = entities.get(entityId);
    return extractModifiersFromEntity(entity, globalWeight, watchlistConfigs);
  });

  const criticality = modifiers.map(([c]) => c);
  const watchlists = modifiers.map(([, w]) => w);

  const factory = v2RiskScoreDocFactory({
    now,
    identifierField: page.identifierField,
    scoreType,
    calculationRunId,
    globalWeight,
  });

  return scores.map((score, i) => factory(score, criticality[i], watchlists[i]));
};

interface RiskScoreDocFactoryParams {
  now: string;
  identifierField: string;
  scoreType: NonNullable<EntityRiskScoreRecord['score_type']>;
  calculationRunId?: string;
  globalWeight?: number;
}

const v2RiskScoreDocFactory =
  ({
    now,
    identifierField,
    scoreType,
    calculationRunId,
    globalWeight = 1,
  }: RiskScoreDocFactoryParams) =>
  (
    score: ParsedRiskScore,
    criticalityModifierFields: Modifier<'asset_criticality'> | undefined,
    watchlistModifiers: Array<Modifier<'watchlist'>>
  ): EntityRiskScoreRecord => {
    const alertsRiskScoreFields = {
      category_1_score: max10DecimalPlaces(score.score / RIEMANN_ZETA_VALUE), // normalize value to be between 0-100
      category_1_count: score.alert_count,
    };

    const watchlistModifierProduct = watchlistModifiers.reduce(
      (acc, m) => acc * (m.modifier_value ?? 1),
      1
    );

    const totalModifier =
      (criticalityModifierFields?.modifier_value ?? 1) * watchlistModifierProduct;

    const originalScore = score.normalized_score * globalWeight;
    const totalScoreWithModifiers = bayesianUpdate({
      modifier: totalModifier,
      score: originalScore,
    });

    const weightedScore = globalWeight !== undefined ? score.score * globalWeight : score.score;
    const finalRiskScoreFields = {
      calculated_level: getRiskLevel(totalScoreWithModifiers),
      calculated_score: max10DecimalPlaces(weightedScore),
      calculated_score_norm: max10DecimalPlaces(totalScoreWithModifiers),
    };

    const appliedModifiers = [criticalityModifierFields, ...watchlistModifiers].filter(isDefined);

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
      id_value: score.entity_id,
      score_type: scoreType,
      ...(calculationRunId !== undefined ? { calculation_run_id: calculationRunId } : {}),
      ...finalRiskScoreFields,
      ...alertsRiskScoreFields,
      ...legacyCat2Fields,
      modifiers,
      notes: [],
      inputs: score.risk_inputs.map((riskInput) => ({
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
