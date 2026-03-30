/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityStoreDataClient } from '../../entity_store/entity_store_data_client';
import type { RiskScoreDataClient } from '../../risk_score/risk_score_data_client';
import type { LeadGenerationMode } from '../../../../../common/entity_analytics/lead_generation/constants';
import { getLeadsIndexName } from '../../../../../common/entity_analytics/lead_generation/constants';
import { getAlertsIndex } from '../../../../../common/entity_analytics/utils';
import { createLeadGenerationEngine } from '../engine/lead_generation_engine';
import { createRiskScoreModule } from '../observation_modules/risk_score_module';
import { createTemporalStateModule } from '../observation_modules/temporal_state_module';
import { createBehavioralAnalysisModule } from '../observation_modules/alert_analysis_module';
import { entityRecordToLeadEntity } from '../entity_conversion';
import type { Lead } from '../types';

const ENTITY_SOURCE_FIELDS = [
  '@timestamp',
  'entity.name',
  'entity.type',
  'entity.EngineMetadata.Type',
  'entity.id',
  'entity.risk',
  'entity.attributes',
  'entity.behaviors',
  'entity.lifecycle',
  'entity.relationships',
  'user.name',
  'user.id',
  'user.email',
  'user.full_name',
  'user.roles',
  'user.domain',
  'host.name',
  'host.hostname',
  'host.id',
  'host.ip',
  'host.os.name',
  'host.type',
  'host.domain',
  'host.architecture',
  'asset.criticality',
];

interface LeadGenerationServiceDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
  readonly entityStoreDataClient: EntityStoreDataClient;
  readonly riskScoreDataClient: RiskScoreDataClient;
}

export interface GenerateResult {
  readonly leads: FormattedLead[];
  readonly total: number;
}

export const createLeadGenerationService = ({
  esClient,
  logger,
  spaceId,
  entityStoreDataClient,
  riskScoreDataClient,
}: LeadGenerationServiceDeps) => ({
  async generate(mode: LeadGenerationMode): Promise<GenerateResult> {
    const routeStart = Date.now();

    const fetchStart = Date.now();
    const entityRecords = await entityStoreDataClient.fetchAllUnifiedLatestEntities({
      sourceFields: ENTITY_SOURCE_FIELDS,
    });
    logger.debug(
      `[LeadGeneration] Entity fetch: ${Date.now() - fetchStart}ms (${
        entityRecords.length
      } records)`
    );

    if (entityRecords.length === 0) {
      return { leads: [], total: 0 };
    }

    const leadEntities = entityRecords.map(entityRecordToLeadEntity);

    const engine = createLeadGenerationEngine({ logger });
    engine.registerModule(createRiskScoreModule({ riskScoreDataClient, logger }));
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
    logger.debug(
      `[LeadGeneration] Engine pipeline: ${Date.now() - generateStart}ms (${leads.length} leads)`
    );

    const executionId = uuidv4();
    const formattedLeads = leads.map((lead) => formatLeadForResponse(lead, executionId));

    const persistStart = Date.now();
    await persistLeads(esClient, spaceId, mode, formattedLeads, executionId, logger);
    logger.debug(
      `[LeadGeneration] Persistence: ${Date.now() - persistStart}ms (${
        formattedLeads.length
      } leads to "${mode}" index)`
    );

    logger.debug(`[LeadGeneration] Total: ${Date.now() - routeStart}ms`);

    return { leads: formattedLeads, total: formattedLeads.length };
  },
});

export const formatLeadForResponse = (lead: Lead, executionId: string) => ({
  id: lead.id,
  title: lead.title,
  byline: lead.byline,
  description: lead.description,
  entities: lead.entities.map(({ type, name }) => ({ type, name })),
  tags: lead.tags,
  priority: lead.priority,
  staleness: lead.staleness,
  chatRecommendations: lead.chatRecommendations,
  observations: lead.observations.map(
    ({ entityId, type, moduleId, score, severity, confidence, description, metadata }) => ({
      entityId,
      type,
      moduleId,
      score,
      severity,
      confidence,
      description,
      metadata,
    })
  ),
  timestamp: lead.timestamp,
  executionId,
});

export type FormattedLead = ReturnType<typeof formatLeadForResponse>;

/**
 * Gap-free replace pattern:
 *   1. Bulk upsert new leads (visible immediately).
 *   2. Delete any docs whose executionId differs (stale from previous runs).
 */
export const persistLeads = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  mode: LeadGenerationMode,
  leads: FormattedLead[],
  executionId: string,
  pLogger: Logger
): Promise<void> => {
  const indexName = getLeadsIndexName(spaceId, mode);

  try {
    if (leads.length > 0) {
      const bulkBody = leads.flatMap((lead) => [
        { index: { _index: indexName, _id: lead.id } },
        lead,
      ]);
      await esClient.bulk({ body: bulkBody, refresh: 'wait_for' });
      pLogger.debug(`[LeadGeneration] Persisted ${leads.length} leads to "${indexName}"`);
    }

    await esClient.deleteByQuery({
      index: indexName,
      query: { bool: { must_not: [{ term: { executionId } }] } },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    });
  } catch (persistError) {
    pLogger.warn(`[LeadGeneration] Failed to persist leads to "${indexName}": ${persistError}`);
  }
};
