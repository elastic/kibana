/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';
import { PLUGIN_ID } from '../../../../common/constants';
import { deduplicateAlerts } from '../../../lib/attack_discovery/pipeline/deduplication';
import { extractEntitiesFromAlerts } from '../../../lib/attack_discovery/pipeline/entity_extraction';
import { DEFAULT_PIPELINE_CONFIG } from '../../../lib/attack_discovery/pipeline/types';

const PipelineRunRequestBody = z.object({
  dry_run: z.boolean().optional().default(false),
  max_alerts: z.number().min(1).max(10000).optional().default(500),
  lookback_minutes: z.number().min(1).max(10080).optional().default(15),
  similarity_threshold: z.number().min(0).max(1).optional().default(0.85),
});

const CaseTriggerAdParams = z.object({ caseId: z.string().min(1) });

const CaseTriggerAdBody = z.object({
  alert_ids: z.array(z.string()).min(1),
});

export const registerPipelineRoutes = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  logger: Logger
): void => {
  router.post(
    {
      path: '/internal/elastic_assistant/attack_discovery/pipeline/_run',
      validate: {
        body: buildRouteValidationWithZod(PipelineRunRequestBody),
      },
      options: {
        tags: ['access:elasticAssistant'],
        timeout: { idleSocket: 10 * 60 * 1000 },
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    },
    async (context, request, response): Promise<IKibanaResponse> => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const {
          max_alerts: maxAlerts,
          lookback_minutes: lookbackMinutes,
          similarity_threshold: threshold,
          dry_run: dryRun,
        } = request.body;

        const now = new Date();
        const lookbackTime = new Date(now.getTime() - lookbackMinutes * 60 * 1000);

        const alertsResult = await esClient.search({
          index: '.alerts-security.alerts-default',
          query: {
            bool: {
              filter: [
                { terms: { 'kibana.alert.workflow_status': ['open', 'acknowledged'] } },
                { range: { '@timestamp': { gte: lookbackTime.toISOString() } } },
                { bool: { must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }] } },
              ],
            },
          },
          sort: [{ 'kibana.alert.risk_score': { order: 'desc' as const } }],
          size: maxAlerts,
        });

        const alerts = alertsResult.hits.hits
          .filter((hit): hit is typeof hit & { _id: string } => hit._id != null)
          .map((hit) => ({
            _id: hit._id,
            _source: (hit._source ?? {}) as Record<string, unknown>,
          }));

        if (alerts.length === 0) {
          return response.ok({
            body: {
              status: 'no_alerts',
              alertsProcessed: 0,
              alertsDeduplicated: 0,
              entitiesExtracted: 0,
            },
          });
        }

        const dedupResult = await deduplicateAlerts({
          alerts,
          esClient,
          logger,
          similarityThreshold: threshold,
        });

        const extractionResult = extractEntitiesFromAlerts({
          alerts: dedupResult.leaders,
          config: DEFAULT_PIPELINE_CONFIG.entityExtraction,
          logger,
        });

        const result = {
          status: dryRun ? 'dry_run_complete' : 'complete',
          alertsProcessed: alerts.length,
          alertsDeduplicated: dedupResult.stats.duplicatesRemoved,
          deduplicationRate: dedupResult.stats.deduplicationRate,
          leaderAlerts: dedupResult.leaders.length,
          entitiesExtracted: extractionResult.stats.entitiesAfterDedup,
          entityBreakdown: extractionResult.entities.reduce((acc, e) => {
            acc[e.typeKey] = (acc[e.typeKey] ?? 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          clusters: dedupResult.clusters.map((c) => ({
            leaderId: c.leaderId,
            memberCount: c.memberIds.length,
          })),
        };

        return response.ok({ body: result });
      } catch (err) {
        const error = transformError(err);
        logger.error(`Pipeline run failed: ${error.message}`);
        return response.customError({
          body: { message: 'Pipeline execution failed' },
          statusCode: error.statusCode,
        });
      }
    }
  );

  router.post(
    {
      path: '/internal/elastic_assistant/attack_discovery/pipeline/case/{caseId}/_trigger_ad',
      validate: {
        params: buildRouteValidationWithZod(CaseTriggerAdParams),
        body: buildRouteValidationWithZod(CaseTriggerAdBody),
      },
      options: {
        tags: ['access:elasticAssistant'],
        timeout: { idleSocket: 10 * 60 * 1000 },
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    },
    async (context, request, response): Promise<IKibanaResponse> => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const assistantContext = await context.elasticAssistant;
        const spaceId = assistantContext.getSpaceId();
        const { caseId } = request.params;
        const { alert_ids: alertIds } = request.body;

        const {
          ensureTrackerIndex,
          getProcessedAlertIds,
          computeDeltaAlertIds,
          updateProcessedAlertIds,
        } = await import(
          '../../../lib/attack_discovery/pipeline/incremental/processed_alert_tracker'
        );

        await ensureTrackerIndex({ esClient, spaceId, logger });

        const tracker = await getProcessedAlertIds({
          esClient,
          spaceId,
          caseId,
          logger,
        });

        const deltaAlertIds = computeDeltaAlertIds({ allCaseAlertIds: alertIds, tracker });

        if (deltaAlertIds.length < 2) {
          return response.ok({
            body: {
              caseId,
              triggered: false,
              reason: `Only ${deltaAlertIds.length} new alerts, need at least 2`,
              deltaAlerts: deltaAlertIds.length,
              totalAlerts: alertIds.length,
              previouslyProcessed: tracker?.processedAlertIds.length ?? 0,
            },
          });
        }

        await updateProcessedAlertIds({
          esClient,
          spaceId,
          caseId,
          newAlertIds: deltaAlertIds,
          generationUuid: `spike-${Date.now()}`,
          logger,
        });

        return response.ok({
          body: {
            caseId,
            triggered: true,
            deltaAlerts: deltaAlertIds.length,
            totalAlerts: alertIds.length,
            previouslyProcessed: tracker?.processedAlertIds.length ?? 0,
            message: `Incremental AD would process ${deltaAlertIds.length} new alerts for case ${caseId}`,
          },
        });
      } catch (err) {
        const error = transformError(err);
        logger.error(`Case AD trigger failed: ${error.message}`);
        return response.customError({
          body: { message: 'Incremental AD trigger failed' },
          statusCode: error.statusCode,
        });
      }
    }
  );
};
