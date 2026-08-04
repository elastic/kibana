/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { RiskScoreDataClient } from '../../risk_score/risk_score_data_client';
import { getAlertsIndex } from '../../../../../common/entity_analytics/utils';
import type { createLeadGenerationEngine } from '../engine/lead_generation_engine';
import { createRiskScoreModule } from './risk_score_module';
import { createTemporalStateModule } from './temporal_state_module';
import { createBehavioralAnalysisModule } from './behavioral_analysis_module';
import { createEntityProfileModule } from './entity_profile_module';
import { createAnomalyDetectionModule } from './anomaly_detection_module';

type LeadGenerationEngine = ReturnType<typeof createLeadGenerationEngine>;

/**
 * Dependencies required to build the full set of observation modules.
 *
 * `ml`, `request`, and `soClient` are optional: the ML anomaly module
 * self-disables when they are absent so the pipeline still runs (with the
 * remaining modules) in contexts without ML access.
 */
export interface ObservationModuleDeps {
  readonly logger: Logger;
  readonly esClient: ElasticsearchClient;
  readonly spaceId: string;
  readonly riskScoreDataClient: RiskScoreDataClient;
  readonly ml?: MlPluginSetup;
  readonly request?: KibanaRequest;
  readonly soClient?: SavedObjectsClientContract;
}

/**
 * Registers every lead-generation observation module on the engine. This is the
 * single source of truth for the module set, so the ad-hoc route, the scheduled
 * task, and the agent-builder tool all produce leads from the same signals.
 * Module weights are defined centrally in `weights.ts`.
 */
export const registerObservationModules = (
  engine: LeadGenerationEngine,
  { logger, esClient, spaceId, riskScoreDataClient, ml, request, soClient }: ObservationModuleDeps
): void => {
  engine.registerModule(createRiskScoreModule({ riskScoreDataClient, logger }));
  engine.registerModule(createTemporalStateModule({ esClient, logger, spaceId }));
  engine.registerModule(
    createBehavioralAnalysisModule({
      esClient,
      logger,
      alertsIndexPattern: getAlertsIndex(spaceId),
    })
  );
  engine.registerModule(createEntityProfileModule({ logger }));
  engine.registerModule(createAnomalyDetectionModule({ logger, ml, request, soClient }));
};
