/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { RiskScoreDataClient } from '../../risk_score/risk_score_data_client';
import type { LeadGenerationMode } from '../../../../../common/entity_analytics/lead_generation/constants';
import { getLeadsIndexName } from '../../../../../common/entity_analytics/lead_generation/constants';
import { getAlertsIndex } from '../../../../../common/entity_analytics/utils';
import { createLeadGenerationEngine } from '../engine/lead_generation_engine';
import { createRiskScoreModule } from '../observation_modules/risk_score_module';
import { createTemporalStateModule } from '../observation_modules/temporal_state_module';
import { createBehavioralAnalysisModule } from '../observation_modules/behavioral_analysis_module';
import type { Lead, LeadEntity } from '../types';

interface LeadGenerationServiceDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
  readonly fetchEntities: () => Promise<LeadEntity[]>;
  readonly riskScoreDataClient: RiskScoreDataClient;
  readonly chatModel: InferenceChatModel;
}

export interface GenerateResult {
  readonly leads: FormattedLead[];
  readonly total: number;
}

export const createLeadGenerationService = ({
  esClient,
  logger,
  spaceId,
  fetchEntities,
  riskScoreDataClient,
  chatModel,
}: LeadGenerationServiceDeps) => ({
  async generate(mode: LeadGenerationMode, executionId: string): Promise<GenerateResult> {
    const routeStart = Date.now();

    const fetchStart = Date.now();
    const leadEntities = await fetchEntities();
    logger.debug(
      `[LeadGeneration] Entity fetch: ${Date.now() - fetchStart}ms (${
        leadEntities.length
      } entities)`
    );

    if (leadEntities.length === 0) {
      return { leads: [], total: 0 };
    }

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
    const leads = await engine.generateLeads(leadEntities, { chatModel });
    logger.debug(
      `[LeadGeneration] Engine pipeline: ${Date.now() - generateStart}ms (${leads.length} leads)`
    );

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

const toSnakeCaseDoc = (lead: FormattedLead, sourceType: LeadGenerationMode) => ({
  id: lead.id,
  title: lead.title,
  byline: lead.byline,
  description: lead.description,
  entities: lead.entities,
  tags: lead.tags,
  priority: lead.priority,
  chat_recommendations: lead.chatRecommendations,
  timestamp: lead.timestamp,
  staleness: lead.staleness,
  status: 'active',
  observations: lead.observations.map((obs) => ({
    entity_id: obs.entityId,
    module_id: obs.moduleId,
    type: obs.type,
    score: obs.score,
    severity: obs.severity,
    confidence: obs.confidence,
    description: obs.description,
    metadata: obs.metadata,
  })),
  execution_uuid: lead.executionId,
  source_type: sourceType,
});

/**
 * Gap-free replace pattern:
 *   1. Bulk upsert new leads (visible immediately).
 *   2. Delete any docs whose execution_uuid differs (stale from previous runs).
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
        toSnakeCaseDoc(lead, mode),
      ]);
      await esClient.bulk({ body: bulkBody, refresh: 'wait_for' });
      pLogger.debug(`[LeadGeneration] Persisted ${leads.length} leads to "${indexName}"`);
    }

    await esClient.deleteByQuery({
      index: indexName,
      query: { bool: { must_not: [{ term: { 'execution_uuid.keyword': executionId } }] } },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    });
  } catch (persistError) {
    pLogger.warn(`[LeadGeneration] Failed to persist leads to "${indexName}": ${persistError}`);
  }
};
