/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import type {
  AnalyticsServiceStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { RelationshipsClient } from '@kbn/entity-store/server';

import type { LeadGenerationMode } from '../../../../common/entity_analytics/lead_generation/constants';
import { LEAD_GENERATION_EXECUTION_EVENT } from '../../telemetry/event_based/events';
import { createLeadGenerationEngine } from './engine/lead_generation_engine';
import type { LeadCandidate } from './engine/lead_generation_engine';
import { registerObservationModules } from './observation_modules/register_modules';
import { errorMessage } from './observation_modules/utils';
import { buildEntityLookupMap } from './entities_relationships';
import { attachRelatedEntities } from './attach_related_entities';
import { buildExploratoryLeads } from './exploratory_leads';
import { createLeadDataClient } from './lead_data_client';
import type { LeadActionDecision } from './lead_data_client';
import type { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import type { Lead as SynthesizedLead, LeadEntity } from './types';

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
  readonly relationshipsClient: RelationshipsClient;
}

const shouldRunLLMSynthesis = (
  item: LeadActionDecision<LeadCandidate>
): item is LeadActionDecision<LeadCandidate> & {
  decision: { type: 'create' } | { type: 'update'; existingId: string; allowReopen: boolean };
} => item.decision.type === 'create' || item.decision.type === 'update';

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
  relationshipsClient,
}: RunPipelineParams): Promise<void> => {
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
    return;
  }

  const buildEntityMapStart = Date.now();
  let entitiesMap: ReadonlyMap<string, LeadEntity>;
  try {
    entitiesMap = await buildEntityLookupMap(leadEntities, esClient, spaceId, logger);
  } catch (error) {
    logger.warn(
      `[LeadGeneration] Failed to build entity lookup map; continuing with candidates only: ${errorMessage(
        error
      )}`
    );
    entitiesMap = new Map(leadEntities.map((entity) => [entity.id, entity]));
  }
  logger.info(
    `[LeadGeneration][Telemetry] Build entity map to lookup related entities: ${
      Date.now() - buildEntityMapStart
    }ms`
  );

  const engine = createLeadGenerationEngine({ logger });
  registerObservationModules(engine, {
    logger,
    esClient,
    spaceId,
    riskScoreDataClient,
    ml,
    request,
    soClient,
    relationshipsClient,
    entitiesMap,
  });

  const prepareStart = Date.now();
  const { confident, exploratory } = await engine.prepareLeadCandidates(leadEntities);
  logger.info(
    `[LeadGeneration][Telemetry] Prepare candidates: ${Date.now() - prepareStart}ms (${
      confident.length
    } confident, ${exploratory.length} exploratory)`
  );
  if (confident.length === 0) {
    return;
  }

  let confidentCandidates = confident;
  let exploratoryCandidates = exploratory;
  const attachStart = Date.now();
  try {
    [confidentCandidates, exploratoryCandidates] = await Promise.all([
      attachRelatedEntities({
        candidates: confident,
        entitiesMap,
        esClient,
        spaceId,
        logger,
        withInteractionCounts: true,
      }),
      attachRelatedEntities({
        candidates: exploratory,
        entitiesMap,
        esClient,
        spaceId,
        logger,
        withInteractionCounts: false,
      }),
    ]);
  } catch (error) {
    logger.warn(
      `[LeadGeneration] Failed to attach related entities; continuing without them: ${errorMessage(
        error
      )}`
    );
  }
  logger.info(`[LeadGeneration][Telemetry] Attach related entities: ${Date.now() - attachStart}ms`);

  const leadDataClient = createLeadDataClient({ esClient, logger, spaceId });

  const exploratoryLeads = await buildExploratoryLeads(exploratoryCandidates, {
    chatModel,
    logger,
  });
  const allCandidates = [...confidentCandidates, ...exploratoryLeads];

  const classifyStart = Date.now();
  const decisions = await leadDataClient.classifyLeadCandidates(allCandidates);
  const toSynthesize = decisions.filter(shouldRunLLMSynthesis);
  const refreshes = decisions.flatMap((item) =>
    item.decision.type === 'refresh'
      ? [
          {
            existingId: item.decision.existingId,
            topRelatedEntities: item.candidate.topRelatedEntities,
            relatedEntityCounts: item.candidate.relatedEntityCounts,
          },
        ]
      : []
  );
  logger.info(
    `[LeadGeneration][Telemetry] Classify leads: ${Date.now() - classifyStart}ms ` +
      `(refresh=${refreshes.length}, synthesize=${toSynthesize.length})`
  );

  const synthStart = Date.now();
  const synthesized = await engine.synthesizeLeads(
    toSynthesize.map(({ candidate }) => candidate),
    { chatModel }
  );
  logger.info(
    `[LeadGeneration][Telemetry] LLM synthesis: ${Date.now() - synthStart}ms (${
      synthesized.length
    }/${allCandidates.length} leads; skipped ${allCandidates.length - toSynthesize.length})`
  );

  const runTimestamp = new Date().toISOString();
  const creates: SynthesizedLead[] = [];
  const updates: Array<{ existingId: string; lead: SynthesizedLead; allowReopen: boolean }> = [];
  for (const { candidate, decision } of toSynthesize) {
    const synthesizedLead = synthesized.find(
      (lead) => hashEuid(lead.entity.id) === candidate.leadId
    );
    if (!synthesizedLead) {
      logger.warn(
        `[LeadGeneration] Skipping persist; no synthesized lead for entity ${candidate.leadId}`
      );
    } else if (decision.type === 'update') {
      updates.push({
        existingId: decision.existingId,
        lead: synthesizedLead,
        allowReopen: decision.allowReopen,
      });
    } else {
      creates.push(synthesizedLead);
    }
  }

  const newLeads = creates.length;
  const revisedLeads = updates.length;
  const resurfacedLeads = refreshes.length;
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
    refreshes,
    creates,
    updates,
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

  analytics?.reportEvent(LEAD_GENERATION_EXECUTION_EVENT.eventType, {
    spaceId,
    leadsGenerated: allCandidates.length,
    newLeads,
    revisedLeads,
    resurfacedLeads,
    skippedLeads,
    failedLeads,
    sourceType,
  });
};
