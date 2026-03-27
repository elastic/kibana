/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IKibanaResponse,
  Logger,
  StartServicesAccessor,
  ElasticsearchClient,
} from '@kbn/core/server';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';

import {
  GENERATE_LEADS_URL,
  getLeadsIndexName,
  type LeadGenerationMode,
} from '../../../../../common/entity_analytics/lead_generation/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import { getAlertsIndex } from '../../../../../common/entity_analytics/utils';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { StartPlugins } from '../../../../plugin';
import { createLeadGenerationEngine } from '../engine/lead_generation_engine';
import { createRiskScoreModule } from '../observation_modules/risk_score_module';
import { createTemporalStateModule } from '../observation_modules/temporal_state_module';
import { createBehavioralAnalysisModule } from '../observation_modules/behavioral_analysis_module';
import type { Entity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { LeadEntity, Lead } from '../types';

export const ENTITY_PAGE_SIZE = 1000;

/**
 * Fields retrieved from Entity Store records. Limits memory footprint by
 * excluding large nested fields that observation modules do not need.
 */
export const ENTITY_SOURCE_FIELDS = [
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
  'host.id',
  'host.hostname',
  'host.ip',
  'host.os.name',
  'host.domain',
  'asset.criticality',
];

const GenerateLeadsRequestBody = z.object({
  mode: z.enum(['adhoc', 'scheduled']).optional().default('adhoc'),
});

export const generateLeadsRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: GENERATE_LEADS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(GenerateLeadsRequestBody),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { getSpaceId } = await context.securitySolution;
          const spaceId = getSpaceId();
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const { mode } = request.body;
          const generationMode: LeadGenerationMode = mode ?? 'adhoc';

          const routeStart = Date.now();

          const fetchStart = Date.now();
          const entityRecords = await fetchAllEntityStoreRecords(esClient, spaceId, logger);
          logger.debug(
            `[LeadGeneration][Telemetry] Entity fetch: ${Date.now() - fetchStart}ms (${
              entityRecords.length
            } records)`
          );

          if (entityRecords.length === 0) {
            return response.ok({ body: { leads: [], total: 0 } });
          }

          const leadEntities: LeadEntity[] = entityRecords.map(entityRecordToLeadEntity);

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
          logger.debug(
            `[LeadGeneration][Telemetry] Engine pipeline: ${Date.now() - generateStart}ms (${
              leads.length
            } leads)`
          );

          // Tag every lead with this run's execution ID so we can delete stale
          // docs atomically after the new set is visible.
          const executionId = uuidv4();
          const formattedLeads = leads.map((lead) => formatLeadForResponse(lead, executionId));

          const persistStart = Date.now();
          await persistLeads(
            esClient,
            spaceId,
            generationMode,
            formattedLeads,
            executionId,
            logger
          );
          logger.debug(
            `[LeadGeneration][Telemetry] Persistence: ${Date.now() - persistStart}ms (${
              formattedLeads.length
            } leads to "${generationMode}" index)`
          );

          logger.debug(`[LeadGeneration][Telemetry] Total route: ${Date.now() - routeStart}ms`);

          return response.ok({ body: { leads: formattedLeads, total: formattedLeads.length } });
        } catch (e) {
          logger.error(`[LeadGeneration] Error generating leads: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};

// ---------------------------------------------------------------------------
// Entity Store V2 fetching — paginated via search_after
//
// V2 stores all entity types (user, host, service, …) in a single unified
// index: `.entities.v2.latest.security_{namespace}`.  This mirrors the pattern
// used by the entity store plugin (getLatestEntitiesIndexName) but avoids a
// cross-plugin import since that helper is not part of the public API.
// ---------------------------------------------------------------------------

export const getEntityStoreLatestIndex = (namespace: string): string =>
  `.entities.v2.latest.security_${namespace}`;

export const fetchAllEntityStoreRecords = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  logger: Logger
): Promise<Entity[]> => {
  const results: Entity[] = [];
  const index = getEntityStoreLatestIndex(spaceId);
  let searchAfter: FieldValue[] | undefined;

  while (true) {
    try {
      const resp = await esClient.search<Entity>({
        index,
        size: ENTITY_PAGE_SIZE,
        ignore_unavailable: true,
        _source: ENTITY_SOURCE_FIELDS,
        sort: [{ '@timestamp': { order: 'desc' } }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
        query: { match_all: {} },
      });

      const hits = resp.hits.hits;
      for (const hit of hits) {
        if (hit._source) results.push(hit._source);
      }

      if (hits.length < ENTITY_PAGE_SIZE) break;
      searchAfter = hits[hits.length - 1].sort as FieldValue[];
    } catch (error) {
      logger.warn(`[LeadGeneration] Failed to fetch entity records from "${index}": ${error}`);
      break;
    }
  }

  return results;
};

// ---------------------------------------------------------------------------
// Entity conversion
// ---------------------------------------------------------------------------

export const entityRecordToLeadEntity = (record: Entity): LeadEntity => {
  const { entity: entityField } = record;
  const engineMeta = entityField?.EngineMetadata as { Type?: string } | undefined;
  return {
    record,
    type: engineMeta?.Type ?? entityField?.type ?? 'unknown',
    name: entityField?.name ?? entityField?.id ?? 'unknown',
    id: entityField?.id ?? entityField?.name ?? 'unknown',
  };
};

// ---------------------------------------------------------------------------
// Lead formatting
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Persistence — gap-free replace pattern:
//   1. Bulk upsert new leads (visible immediately).
//   2. Delete any docs whose executionId differs (stale from previous runs).
// ---------------------------------------------------------------------------

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
