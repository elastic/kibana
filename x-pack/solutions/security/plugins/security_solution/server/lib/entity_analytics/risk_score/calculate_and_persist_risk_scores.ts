/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { ExperimentalFeatures } from '../../../../common';
import type { EntityType } from '../../../../common/search_strategy';
import type { RiskScoreDataClient } from './risk_score_data_client';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import type { CalculateAndPersistScoresParams } from '../types';
import { calculateScoresWithESQL } from './calculate_esql_risk_scores';
import type { RiskScoresCalculationResponse } from '../../../../common/api/entity_analytics';
import type { PrivmonUserCrudService } from '../privilege_monitoring/users/privileged_users_crud';

export type CalculationResults = RiskScoresCalculationResponse & {
  entities: Record<EntityType, string[]>;
};

export const calculateAndPersistRiskScores = async (
  params: CalculateAndPersistScoresParams & {
    assetCriticalityService: AssetCriticalityService;
    privmonUserCrudService: PrivmonUserCrudService;
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

  const { after_keys: afterKeys, scores } = await calculateScoresWithESQL(rest);

  // Extract entity IDs from scores for reset-to-zero functionality
  const entities: Record<EntityType, string[]> = {
    host: scores.host?.map((score: { id_value: string }) => score.id_value) || [],
    user: scores.user?.map((score: { id_value: string }) => score.id_value) || [],
    service: scores.service?.map((score: { id_value: string }) => score.id_value) || [],
    generic: scores.generic?.map((score: { id_value: string }) => score.id_value) || [],
  };

  if (!scores.host?.length && !scores.user?.length && !scores.service?.length) {
    return {
      after_keys: {},
      errors: [],
      scores_written: 0,
      entities,
    };
  }

  try {
    await riskScoreDataClient.upgradeIfNeeded();
  } catch (err) {
    params.logger.error(
      `There was an error upgrading the risk score indices. Continuing with risk score persistence. ${err.message}`
    );
  }

  const { errors, docs_written: scoresWritten } = await writer.bulk({ ...scores, refresh });

  const result = {
    after_keys: afterKeys,
    errors,
    scores_written: scoresWritten,
    entities,
  };

  return returnScores ? { ...result, scores } : result;
};
