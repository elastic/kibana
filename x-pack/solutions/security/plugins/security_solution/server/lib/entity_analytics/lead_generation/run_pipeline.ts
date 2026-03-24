/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { EntityStoreDataClient } from '../entity_store/entity_store_data_client';

import type { LeadGenerationMode } from '../../../../common/entity_analytics/lead_generation/constants';
import { getAlertsIndex } from '../../../../common/entity_analytics/utils';
import { createLeadGenerationEngine } from './engine/lead_generation_engine';
import { createRiskScoreModule } from './observation_modules/risk_score_module';
import { createTemporalStateModule } from './observation_modules/temporal_state_module';
import { createBehavioralAnalysisModule } from './observation_modules/behavioral_analysis_module';
import { entityRecordToLeadEntity } from './entity_conversion';
import { createLeadDataClient } from './lead_data_client';

export interface RunPipelineParams {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
  readonly entityStoreDataClient: EntityStoreDataClient;
  readonly executionId?: string;
  readonly sourceType: LeadGenerationMode;
}

export interface RunPipelineResult {
  readonly total: number;
}

/**
 * Shared pipeline logic used by both the ad-hoc generate route and the
 * scheduled Task Manager task.
 */
export const runLeadGenerationPipeline = async ({
  esClient,
  logger,
  spaceId,
  entityStoreDataClient,
  executionId: providedExecutionId,
  sourceType,
}: RunPipelineParams): Promise<RunPipelineResult> => {
  const executionId = providedExecutionId ?? uuidv4();
  const pipelineStart = Date.now();

  const fetchStart = Date.now();
  const entityResponse = await entityStoreDataClient.searchEntities({
    entityTypes: [EntityType.host, EntityType.user, EntityType.service],
    filterQuery: '',
    page: 1,
    perPage: 10000,
    sortField: 'entity.name',
    sortOrder: 'asc',
  });
  const leadEntities = entityResponse.records.map(entityRecordToLeadEntity);
  logger.info(
    `[LeadGeneration][Telemetry] Entity fetch: ${Date.now() - fetchStart}ms (${
      leadEntities.length
    } records)`
  );

  if (leadEntities.length === 0) {
    logger.info(
      `[LeadGeneration] No entities found — skipping generation (executionId=${executionId})`
    );
    return { total: 0 };
  }

  const engine = createLeadGenerationEngine({ logger });
  engine.registerModule(createRiskScoreModule({ esClient, logger, spaceId }));
  engine.registerModule(createTemporalStateModule({ esClient, logger, spaceId }));
  engine.registerModule(
    createBehavioralAnalysisModule({
      esClient,
      logger,
      alertsIndexPattern: getAlertsIndex(spaceId),
    })
  );

  const generateStart = Date.now();
  const leads = await engine.generateLeads(leadEntities);
  logger.info(
    `[LeadGeneration][Telemetry] Engine pipeline: ${Date.now() - generateStart}ms (${
      leads.length
    } leads)`
  );

  const leadDataClient = createLeadDataClient({ esClient, logger, spaceId });
  const persistStart = Date.now();

  const leadsWithMeta = leads.map((lead) => ({
    ...lead,
    status: 'active' as const,
    executionUuid: executionId,
    sourceType,
  }));

  await leadDataClient.createLeads({
    leads: leadsWithMeta,
    executionId,
    sourceType,
  });

  logger.info(
    `[LeadGeneration][Telemetry] Persistence: ${Date.now() - persistStart}ms (${
      leads.length
    } leads to ${sourceType} index)`
  );
  logger.info(
    `[LeadGeneration][Telemetry] Total pipeline: ${
      Date.now() - pipelineStart
    }ms (executionId=${executionId})`
  );

  return { total: leads.length };
};
