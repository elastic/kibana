/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ExperimentalFeatures } from '../../../../common';
import type { RiskScoresPreviewResponse } from '../../../../common/api/entity_analytics';
import type {
  CalculateAndPersistScoresParams,
  CalculateScoresParams,
  EntityAnalyticsConfig,
  RiskEngineConfiguration,
} from '../types';
import { calculateRiskScores } from './calculate_risk_scores';
import type { CalculationResults } from './calculate_and_persist_risk_scores';
import { calculateAndPersistRiskScores } from './calculate_and_persist_risk_scores';
import type { RiskEngineDataClient } from '../risk_engine/risk_engine_data_client';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import type { RiskScoreDataClient } from './risk_score_data_client';
import type { RiskInputsIndexResponse } from './get_risk_inputs_index';
import { scheduleLatestTransformNow } from '../utils/transforms';
import { calculateScoresWithESQL } from './calculate_esql_risk_scores';
import type { ResetToZeroDependencies } from './reset_to_zero';
import { resetToZero } from './reset_to_zero';

export type RiskEngineConfigurationWithDefaults = RiskEngineConfiguration & {
  alertSampleSizePerShard: number;
};
export interface RiskScoreService {
  calculateScores: (params: CalculateScoresParams) => Promise<RiskScoresPreviewResponse>;
  calculateAndPersistScores: (
    params: CalculateAndPersistScoresParams
  ) => Promise<CalculationResults>;
  getConfigurationWithDefaults: (
    entityAnalyticsConfig: EntityAnalyticsConfig
  ) => Promise<RiskEngineConfigurationWithDefaults | null>;
  getRiskInputsIndex: ({ dataViewId }: { dataViewId: string }) => Promise<RiskInputsIndexResponse>;
  scheduleLatestTransformNow: () => Promise<void>;
  refreshRiskScoreIndex: () => Promise<void>;
  resetToZero: (
    deps: Pick<ResetToZeroDependencies, 'refresh' | 'entityType' | 'excludedEntities'>
  ) => Promise<void>;
}

export interface RiskScoreServiceFactoryParams {
  assetCriticalityService: AssetCriticalityService;
  esClient: ElasticsearchClient;
  logger: Logger;
  riskEngineDataClient: RiskEngineDataClient;
  riskScoreDataClient: RiskScoreDataClient;
  spaceId: string;
  refresh?: 'wait_for';
  experimentalFeatures: ExperimentalFeatures;
}

export const riskScoreServiceFactory = ({
  assetCriticalityService,
  esClient,
  logger,
  riskEngineDataClient,
  riskScoreDataClient,
  spaceId,
  experimentalFeatures,
}: RiskScoreServiceFactoryParams): RiskScoreService => ({
  calculateScores: (params) => {
    const calculate = experimentalFeatures.disableESQLRiskScoring
      ? calculateRiskScores
      : calculateScoresWithESQL;
    return calculate({
      ...params,
      assetCriticalityService,
      esClient,
      logger,
      experimentalFeatures,
    });
  },
  calculateAndPersistScores: (params) =>
    calculateAndPersistRiskScores({
      ...params,
      assetCriticalityService,
      esClient,
      logger,
      riskScoreDataClient,
      spaceId,
      experimentalFeatures,
    }),
  getConfigurationWithDefaults: async (entityAnalyticsConfig: EntityAnalyticsConfig) => {
    const savedObjectConfig = await riskEngineDataClient.getConfiguration();

    if (!savedObjectConfig) {
      return null;
    }

    const alertSampleSizePerShard =
      savedObjectConfig.alertSampleSizePerShard ??
      entityAnalyticsConfig.riskEngine.alertSampleSizePerShard;

    return {
      ...savedObjectConfig,
      alertSampleSizePerShard,
    };
  },
  resetToZero: async (
    deps: Pick<ResetToZeroDependencies, 'refresh' | 'entityType' | 'excludedEntities'>
  ) => {
    await resetToZero({
      ...deps,
      esClient,
      dataClient: riskScoreDataClient,
      spaceId,
      assetCriticalityService,
      logger,
    });
  },

  getRiskInputsIndex: async (params) => riskScoreDataClient.getRiskInputsIndex(params),
  scheduleLatestTransformNow: () =>
    scheduleLatestTransformNow({ namespace: spaceId, esClient, logger }),
  refreshRiskScoreIndex: () => riskScoreDataClient.refreshRiskScoreIndex(),
});
