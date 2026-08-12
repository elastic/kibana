/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  AnalyticsServiceStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';

import type { LeadGenerationMode } from '../../../../common/entity_analytics/lead_generation/constants';
import type { Lead as PersistedLead } from '../../../../common/entity_analytics/lead_generation/types';
import { LEAD_GENERATION_EXECUTION_EVENT } from '../../telemetry/event_based/events';
import { createLeadGenerationEngine } from './engine/lead_generation_engine';
import type { LeadCandidate } from './engine/lead_generation_engine';
import { registerObservationModules } from './observation_modules/register_modules';
import { createLeadDataClient } from './lead_data_client';
import type { LeadActionDecision } from './lead_data_client';
import { computeEntityIdentityKey } from './content_hash';
import type { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import type { Lead, LeadEntity } from './types';

export interface RunPipelineParams {
  readonly listEntities: () => Promise<LeadEntity[]>;
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
  readonly riskScoreDataClient: RiskScoreDataClient;
  readonly executionId?: string;
  readonly sourceType: LeadGenerationMode;
  readonly analytics?: AnalyticsServiceStart;
  readonly chatModel: InferenceChatModel;
  /** Optional ML deps; when present the anomaly module is enabled. */
  readonly ml?: MlPluginSetup;
  readonly request?: KibanaRequest;
  readonly soClient?: SavedObjectsClientContract;
}

export interface RunPipelineResult {
  readonly total: number;
}

const toPersistedLead = (
  lead: Lead,
  executionId: string,
  sourceType: LeadGenerationMode,
  runTimestamp: string
): PersistedLead => ({
  ...lead,
  entities: lead.entities.map(({ type, name, id }) => ({ type, name, id })),
  timestamp: runTimestamp,
  status: 'active',
  executionUuid: executionId,
  sourceType,
  createdAt: runTimestamp,
  updatedAt: runTimestamp,
});

const shouldRunLLMSynthesis = (
  item: LeadActionDecision<LeadCandidate>
): item is LeadActionDecision<LeadCandidate> & {
  decision: { type: 'create' } | { type: 'version'; existingId: string };
} => item.decision.type === 'create' || item.decision.type === 'version';

/**
 * Shared pipeline logic used by both the ad-hoc generate route and the
 * scheduled Task Manager task.
 *
 * Classifies candidates against existing leads before LLM synthesis so
 * unchanged and previously dismissed leads do not pay for
 * narrative generation.
 */
export const runLeadGenerationPipeline = async ({
  listEntities,
  esClient,
  logger,
  spaceId,
  riskScoreDataClient,
  executionId: providedExecutionId,
  sourceType,
  analytics,
  chatModel,
  ml,
  request,
  soClient,
}: RunPipelineParams): Promise<RunPipelineResult> => {
  const executionId = providedExecutionId ?? uuidv4();
  const pipelineStart = Date.now();

  const fetchStart = Date.now();
  const leadEntities = await listEntities();
  logger.info(
    `[LeadGeneration][Telemetry] Entities fetch: ${Date.now() - fetchStart}ms (${
      leadEntities.length
    } candidates)`
  );
  if (leadEntities.length === 0) {
    logger.info(
      `[LeadGeneration] No entities found — skipping generation (executionId=${executionId})`
    );
    return { total: 0 };
  }

  const engine = createLeadGenerationEngine({ logger });
  registerObservationModules(engine, {
    logger,
    esClient,
    spaceId,
    riskScoreDataClient,
    ml,
    request,
    soClient,
  });

  const prepareStart = Date.now();
  const candidates = await engine.prepareLeadCandidates(leadEntities);
  logger.info(
    `[LeadGeneration][Telemetry] Prepare candidates: ${Date.now() - prepareStart}ms (${
      candidates.length
    } candidates)`
  );
  if (candidates.length === 0) {
    return { total: 0 };
  }

  const leadDataClient = createLeadDataClient({ esClient, logger, spaceId });

  const classifyStart = Date.now();
  const decisions = await leadDataClient.classifyLeadCandidates(candidates);
  const toSynthesize = decisions.filter(shouldRunLLMSynthesis);
  const dedups = decisions.flatMap((item) =>
    item.decision.type === 'dedup' ? [{ existingId: item.decision.existingId }] : []
  );
  logger.info(
    `[LeadGeneration][Telemetry] Classify leads: ${Date.now() - classifyStart}ms ` +
      `(dedup=${dedups.length}, synthesize=${toSynthesize.length})`
  );

  const synthStart = Date.now();
  const synthesized = await engine.synthesizeLeads(
    toSynthesize.map(({ candidate }) => candidate),
    { chatModel }
  );
  logger.info(
    `[LeadGeneration][Telemetry] LLM synthesis: ${Date.now() - synthStart}ms (${
      synthesized.length
    }/${candidates.length} leads; skipped ${candidates.length - toSynthesize.length})`
  );

  const runTimestamp = new Date().toISOString();
  const creates: PersistedLead[] = [];
  const versions: Array<{ existingId: string; lead: PersistedLead }> = [];
  for (const { candidate, decision } of toSynthesize) {
    const synthesizedLead = synthesized.find(
      (lead) =>
        computeEntityIdentityKey({ entities: lead.entities }) === candidate.entityIdentityKey
    );
    if (!synthesizedLead) {
      logger.warn(
        `[LeadGeneration] Skipping persist; no synthesized lead for entity ${candidate.entityIdentityKey}`
      );
    } else {
      const lead = toPersistedLead(synthesizedLead, executionId, sourceType, runTimestamp);
      if (decision.type === 'version') {
        versions.push({ existingId: decision.existingId, lead });
      } else {
        creates.push(lead);
      }
    }
  }

  const newLeads = creates.length;
  const revisedLeads = versions.length;
  const resurfacedLeads = dedups.length;
  const skippedLeads = decisions.filter((item) => item.decision.type === 'skip').length;
  const persistAttempted = newLeads + revisedLeads + resurfacedLeads;

  logger.info(
    `[LeadGeneration][Telemetry] Prepared actions: ` +
      `new=${newLeads}, revised=${revisedLeads}, resurfaced=${resurfacedLeads}, skipped=${skippedLeads}`
  );

  const persistStart = Date.now();
  const failedLeads = await leadDataClient.persistLeads({
    executionId,
    sourceType,
    timestamp: runTimestamp,
    dedups,
    creates,
    versions,
  });
  logger.info(
    `[LeadGeneration][Telemetry] Persistence: ${Date.now() - persistStart}ms ` +
      `(failed=${failedLeads}/${persistAttempted})`
  );
  logger.info(
    `[LeadGeneration][Telemetry] Total pipeline: ${
      Date.now() - pipelineStart
    }ms (executionId=${executionId})`
  );

  const totalLeads = newLeads + revisedLeads + resurfacedLeads + skippedLeads;

  analytics?.reportEvent(LEAD_GENERATION_EXECUTION_EVENT.eventType, {
    spaceId,
    leadsGenerated: totalLeads,
    newLeads,
    revisedLeads,
    resurfacedLeads,
    skippedLeads,
    failedLeads,
    sourceType,
  });

  return { total: totalLeads };
};
