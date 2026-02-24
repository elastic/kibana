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
  BatchProcessor,
  AttackDiscoveryMergeService,
  type AlertForProcessing,
  type BatchProcessingConfig,
  type BatchProcessingResult,
  DEFAULT_BATCH_CONFIG,
} from '../../../lib/attack_discovery/batch_processing';
import { generateAttackDiscoveries } from '../helpers/generate_discoveries';

const ROUTE_HANDLER_TIMEOUT = 30 * 60 * 1000; // 30 minutes for batched processing

/**
 * Route path for batched attack discovery generation
 */
export const ATTACK_DISCOVERY_BATCHED = '/api/attack_discovery/_generate_batched';

/**
 * Request body schema for batched attack discovery generation
 */
const BatchedAttackDiscoveryRequestBody = z.object({
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
  // Batched processing options
  batchConfig: z
    .object({
      batchSize: z.number().min(10).max(500).optional(),
      maxAlerts: z.number().min(1).optional(),
      parallelBatches: z.number().min(1).max(5).optional(),
      mergeStrategy: z.enum(['simple', 'llm', 'hierarchical']).optional(),
      deduplicateAlerts: z.boolean().optional(),
    })
    .optional(),
});

type BatchedAttackDiscoveryRequest = z.infer<typeof BatchedAttackDiscoveryRequestBody>;

/**
 * Response schema for batched attack discovery generation
 */
interface BatchedAttackDiscoveryResponse {
  execution_uuid: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  total_alerts?: number;
  batch_count?: number;
}

export const postBatchedAttackDiscoveryRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY_BATCHED,
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
            body: buildRouteValidationWithZod(BatchedAttackDiscoveryRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<BatchedAttackDiscoveryResponse>> => {
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
          const { batchConfig = {} } = request.body;

          // Configure batch processing
          const batchProcessingConfig: BatchProcessingConfig = {
            ...DEFAULT_BATCH_CONFIG,
            batchSize: batchConfig.batchSize ?? DEFAULT_BATCH_CONFIG.batchSize,
            maxAlerts: batchConfig.maxAlerts,
            parallelBatches: batchConfig.parallelBatches ?? DEFAULT_BATCH_CONFIG.parallelBatches,
            mergeStrategy: batchConfig.mergeStrategy ?? DEFAULT_BATCH_CONFIG.mergeStrategy,
            deduplicateAlerts:
              batchConfig.deduplicateAlerts ?? DEFAULT_BATCH_CONFIG.deduplicateAlerts,
          };

          // Create merge service
          const mergeService = new AttackDiscoveryMergeService({ logger });

          // Create batch processor function that uses the existing graph
          const processBatch = async (alerts: AlertForProcessing[]) => {
            // Convert to size-based config for existing graph
            const result = await generateAttackDiscoveries({
              actionsClient,
              config: {
                alertsIndexPattern,
                anonymizationFields: request.body.anonymizationFields,
                apiConfig: request.body.apiConfig,
                connectorName: request.body.connectorName,
                filter: {
                  ...request.body.filter,
                  // Add filter to only process specific alert IDs
                  bool: {
                    must: [
                      ...(request.body.filter?.bool?.must ?? []),
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

          // Create batch processor
          const batchProcessor = new BatchProcessor({
            logger,
            config: batchProcessingConfig,
          });

          // Start batched processing in background
          logger.info(
            `Starting batched Attack Discovery generation ${executionUuid} with config: ${JSON.stringify(
              batchProcessingConfig
            )}`
          );

          // First, fetch all matching alerts to get their IDs
          const alertsQuery = await esClient.search({
            index: alertsIndexPattern,
            size: batchProcessingConfig.maxAlerts ?? 10000,
            query: request.body.filter ?? { match_all: {} },
            _source: false, // We only need IDs for now
          });

          const alertsForProcessing: AlertForProcessing[] = alertsQuery.hits.hits.map((hit) => ({
            id: hit._id!,
            content: '', // Content will be fetched during batch processing
          }));

          logger.info(
            `Found ${alertsForProcessing.length} alerts for batched processing in execution ${executionUuid}`
          );

          // Process batches (in background, not awaited)
          batchProcessor
            .process(alertsForProcessing, processBatch, (results) =>
              mergeService.merge(results[0] ?? [], results[1] ?? [])
            )
            .then(async (result: BatchProcessingResult) => {
              logger.info(
                `Batched Attack Discovery generation ${executionUuid} completed: ${result.discoveries.length} discoveries from ${result.totalAlertsProcessed} alerts in ${result.totalDurationMs}ms`
              );
              // TODO: Store results using dataClient
            })
            .catch((error) => {
              logger.error(
                `Batched Attack Discovery generation ${executionUuid} failed: ${error.message}`
              );
            });

          return response.ok({
            body: {
              execution_uuid: executionUuid,
              status: 'started',
              total_alerts: alertsForProcessing.length,
              batch_count: Math.ceil(alertsForProcessing.length / batchProcessingConfig.batchSize),
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
