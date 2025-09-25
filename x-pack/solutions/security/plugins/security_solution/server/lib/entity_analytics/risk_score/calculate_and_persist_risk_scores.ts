/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { ExperimentalFeatures } from '../../../../common';
import type {
  EntityType,
  RiskScoresCalculationResponse,
} from '../../../../common/api/entity_analytics';
import type { RiskScoreDataClient } from './risk_score_data_client';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import { calculateRiskScores } from './calculate_risk_scores';
import type { CalculateAndPersistScoresParams } from '../types';
import { calculateScoresWithESQL } from './calculate_esql_risk_scores';

export type CalculationResults = RiskScoresCalculationResponse & {
  entities: Record<EntityType, string[]>;
};
export const calculateAndPersistRiskScores = async (
  params: CalculateAndPersistScoresParams & {
    assetCriticalityService: AssetCriticalityService;
    esClient: ElasticsearchClient;
    logger: Logger;
    spaceId: string;
    riskScoreDataClient: RiskScoreDataClient;
    experimentalFeatures: ExperimentalFeatures;
  }
): Promise<CalculationResults> => {
  const { riskScoreDataClient, spaceId, returnScores, refresh, ...rest } = params;

  const writer = await riskScoreDataClient.getWriter({
    namespace: spaceId,
  });

  const calculate = params.experimentalFeatures.disableESQLRiskScoring
    ? calculateRiskScores
    : calculateScoresWithESQL;
  const { after_keys: afterKeys, scores, entities } = await calculate(rest);

  if (!scores.host?.length && !scores.user?.length && !scores.service?.length) {
    return { after_keys: {}, errors: [], scores_written: 0, entities };
  }

  try {
    await riskScoreDataClient.upgradeIfNeeded();
  } catch (err) {
    params.logger.error(
      `There was an error upgrading the risk score indices. Continuing with risk score persistence. ${err.message}`
    );
  }

  const { errors, docs_written: scoresWritten } = await writer.bulk({ ...scores, refresh });

  const result = { after_keys: afterKeys, errors, scores_written: scoresWritten, entities };

  return returnScores ? { ...result, scores } : result;
};
