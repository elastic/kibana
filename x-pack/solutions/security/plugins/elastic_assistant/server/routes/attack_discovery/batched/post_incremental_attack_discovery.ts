/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, IKibanaResponse } from '@kbn/core/server';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';

import { performChecks } from '../../helpers';
import { buildResponse } from '../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';
import { hasReadWriteAttackDiscoveryAlertsPrivileges } from '../helpers/index_privileges';
import {
  AttackDiscoveryMergeService,
  type AttackDiscoveryResult,
} from '../../../lib/attack_discovery/batch_processing';
import {
  IncrementalProcessor,
  type IncrementalAttackDiscovery,
} from '../../../lib/attack_discovery/incremental_processing';
import { generateAttackDiscoveries } from '../helpers/generate_discoveries';

const ROUTE_HANDLER_TIMEOUT = 15 * 60 * 1000; // 15 minutes for incremental processing

/**
 * Route path for incremental attack discovery generation
 */
export const ATTACK_DISCOVERY_INCREMENTAL = '/api/attack_discovery/_generate_incremental';

/**
 * Request body schema for incremental attack discovery generation
 */
const IncrementalAttackDiscoveryRequestBody = z.object({
  alertsIndexPattern: z.string().min(1),
  anonymizationFields: z.array(z.any()),
  apiConfig: z.object({
    connectorId: z.string().min(1),
    actionTypeId: z.string().min(1),
    model: z.string().optional(),
  }),
  connectorName: z.string().optional(),
  filter: z.record(z.unknown()).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  replacements: z.record(z.string()).optional(),
  langSmithApiKey: z.string().optional(),
  langSmithProject: z.string().optional(),
  // Incremental processing options
  existingDiscoveryId: z.string().optional(),
  existingDiscovery: z
    .object({
      id: z.string(),
      title: z.string(),
      summaryMarkdown: z.string(),
      detailsMarkdown: z.string().optional(),
      entitySummaryMarkdown: z.string().optional(),
      alertIds: z.array(z.string()),
      mitreAttackTactics: z.array(z.string()).optional(),
      riskScore: z.number().optional(),
      processedAlertIds: z.array(z.string()),
      isIncremental: z.boolean(),
      lastUpdatedAt: z.string(),
      updateCount: z.number(),
      originalCreatedAt: z.string(),
    })
    .optional(),
  newAlertIds: z.array(z.string()),
  mode: z.enum(['enhance', 'delta', 'full']).default('delta'),
  // Optional: case context for case-scoped incremental updates
  caseId: z.string().optional(),
});

/**
 * Response for incremental attack discovery generation
 */
interface IncrementalAttackDiscoveryResponse {
  execution_uuid: string;
  discovery: IncrementalAttackDiscovery;
  action: 'created' | 'enhanced' | 'replaced';
  metrics: {
    newAlertsProcessed: number;
    totalAlertsInScope: number;
    processingDurationMs: number;
    mergeOperations: number;
  };
}

export const postIncrementalAttackDiscoveryRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY_INCREMENTAL,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(IncrementalAttackDiscoveryRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<IncrementalAttackDiscoveryResponse>> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;

        const logger: Logger = assistantContext.logger;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const actions = (await context.elasticAssistant).actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const dataClient = await assistantContext.getAttackDiscoveryDataClient();
          const authenticatedUser = await assistantContext.getCurrentUser();

          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }

          if (!dataClient) {
            return resp.error({
              body: `Attack discovery data client not initialized`,
              statusCode: 500,
            });
          }

          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const savedObjectsClient = assistantContext.savedObjectsClient;

          // Perform alerts access check
          const privilegesCheckResponse = await hasReadWriteAttackDiscoveryAlertsPrivileges({
            context: performChecksContext,
            response,
          });
          if (!privilegesCheckResponse.isSuccess) {
            return privilegesCheckResponse.response;
          }

          const executionUuid = uuidv4();
          const alertsIndexPattern = decodeURIComponent(request.body.alertsIndexPattern);
          const { newAlertIds, mode, existingDiscovery } = request.body;

          logger.info(
            `Starting incremental Attack Discovery generation ${executionUuid} with mode: ${mode}, newAlerts: ${newAlertIds.length}`
          );

          // Validate new alerts exist
          if (newAlertIds.length === 0 && mode !== 'full') {
            return resp.error({
              body: 'No new alert IDs provided for incremental processing',
              statusCode: 400,
            });
          }

          // Fetch new alerts content
          const alertsResponse = await esClient.search({
            index: alertsIndexPattern,
            size: newAlertIds.length,
            query: {
              terms: {
                _id: newAlertIds,
              },
            },
          });

          const newAlerts = alertsResponse.hits.hits.map((hit) => ({
            id: hit._id ?? '',
            content: JSON.stringify(hit._source),
          }));

          // Create merge service
          const mergeService = new AttackDiscoveryMergeService({ logger });

          // Create generate function that wraps the existing discovery graph
          const generateDiscovery = async (
            alerts: Array<{ id: string; content: string }>
          ): Promise<AttackDiscoveryResult[]> => {
            const result = await generateAttackDiscoveries({
              actionsClient,
              config: {
                alertsIndexPattern,
                anonymizationFields: request.body.anonymizationFields,
                apiConfig: request.body.apiConfig,
                connectorName: request.body.connectorName,
                subAction: 'invokeAI',
                filter: {
                  bool: {
                    must: [
                      {
                        terms: {
                          _id: alerts.map((a) => a.id),
                        },
                      },
                    ],
                  },
                },
                replacements: request.body.replacements ?? {},
                size: alerts.length,
                start: request.body.start,
                end: request.body.end,
                langSmithApiKey: request.body.langSmithApiKey,
                langSmithProject: request.body.langSmithProject,
              },
              esClient,
              logger,
              savedObjectsClient,
            });

            return (result.attackDiscoveries ?? []).map((ad) => ({
              id: ad.id ?? uuidv4(),
              title: ad.title,
              summaryMarkdown: ad.summaryMarkdown,
              detailsMarkdown: ad.detailsMarkdown ?? '',
              entitySummaryMarkdown: ad.entitySummaryMarkdown,
              alertIds: ad.alertIds,
              mitreAttackTactics: ad.mitreAttackTactics,
              riskScore: undefined,
            }));
          };

          // Create incremental processor
          const incrementalProcessor = new IncrementalProcessor({
            logger,
            mergeService,
            generateDiscovery,
          });

          // Determine all alert IDs in scope
          const existingAlertIds = existingDiscovery?.processedAlertIds ?? [];
          const allAlertIds = [...new Set([...existingAlertIds, ...newAlertIds])];

          // Process incrementally
          const result = await incrementalProcessor.process({
            existingDiscovery: existingDiscovery as IncrementalAttackDiscovery | undefined,
            newAlerts,
            allAlertIds,
            mode,
          });

          logger.info(
            `Incremental Attack Discovery generation ${executionUuid} completed: action=${result.action}, newAlertsProcessed=${result.metrics.newAlertsProcessed}`
          );

          return response.ok({
            body: {
              execution_uuid: executionUuid,
              discovery: result.discovery,
              action: result.action,
              metrics: result.metrics,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
