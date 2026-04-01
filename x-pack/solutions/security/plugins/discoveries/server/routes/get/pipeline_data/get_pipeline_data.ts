/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CoreStart, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';
import type {
  DiagnosticsContext,
  WorkflowExecutionsTracking,
} from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';

import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import type { WorkflowsManagementApi } from '@kbn/discoveries/impl/attack_discovery/generation/types';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import type { WorkflowInitializationService } from '../../../lib/workflow_initialization';
import { computeCombinedAlerts, type CombinedAlerts } from './helpers/compute_combined_alerts';
import {
  extractPipelineAlertData,
  type ExtractionStrategy,
} from './helpers/extract_pipeline_alert_data';
import {
  extractPipelineGenerationData,
  type PipelineGenerationData,
} from './helpers/extract_pipeline_generation_data';
import { extractPipelineValidationData } from './helpers/extract_pipeline_validation_data';
import { getWorkflowExecutionsTracking } from './helpers/get_workflow_executions_tracking';

const ROUTE_PATH = '/internal/attack_discovery/workflow/{workflow_id}/execution/{execution_id}';

/** Zod schema for validating path parameters */
export const GetPipelineDataRequestParams = z.object({
  execution_id: z.string(),
  workflow_id: z.string(),
});

/** snake_case response shape for a single workflow execution tracking entry */
interface WorkflowExecutionTrackingResponse {
  workflow_id: string;
  workflow_run_id: string;
}

/** snake_case response shape for all workflow execution tracking */
interface WorkflowExecutionsTrackingResponse {
  alert_retrieval: WorkflowExecutionTrackingResponse[] | null;
  generation: WorkflowExecutionTrackingResponse | null;
  validation: WorkflowExecutionTrackingResponse | null;
}

/** Per-workflow alert retrieval data in the response */
export interface AlertRetrievalPipelineDataResponse {
  alerts: string[];
  alerts_context_count: number | null;
  extraction_strategy: ExtractionStrategy;
  workflow_id: string;
  workflow_run_id: string;
}

/** Full pipeline data response */
export interface GetPipelineDataResponse {
  alert_retrieval: AlertRetrievalPipelineDataResponse[] | null;
  combined_alerts: CombinedAlerts | null;
  diagnostics_context?: DiagnosticsContext;
  generation: PipelineGenerationData | null;
  validated_discoveries: AttackDiscoveryApiAlert[] | null;
  workflow_executions_tracking: WorkflowExecutionsTrackingResponse;
}

/** Minimal fallback config used when apiConfig is not available from the request. */
const FALLBACK_API_CONFIG = {
  action_type_id: '',
  connector_id: '',
};

/** Converts camelCase WorkflowExecutionsTracking to snake_case for the response. */
const toSnakeCaseTracking = (
  tracking: WorkflowExecutionsTracking
): WorkflowExecutionsTrackingResponse => ({
  alert_retrieval:
    tracking.alertRetrieval?.map((entry) => ({
      workflow_id: entry.workflowId,
      workflow_run_id: entry.workflowRunId,
    })) ?? null,
  generation:
    tracking.generation != null
      ? {
          workflow_id: tracking.generation.workflowId,
          workflow_run_id: tracking.generation.workflowRunId,
        }
      : null,
  validation:
    tracking.validation != null
      ? {
          workflow_id: tracking.validation.workflowId,
          workflow_run_id: tracking.validation.workflowRunId,
        }
      : null,
});

export const registerGetPipelineDataRoute = (
  router: IRouter,
  logger: Logger,
  {
    getEventLogIndex,
    getStartServices,
    workflowInitService,
    workflowsManagementApi,
  }: {
    getEventLogIndex: () => Promise<string>;
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
    workflowInitService: WorkflowInitializationService;
    workflowsManagementApi?: WorkflowsManagementApi;
  }
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: GetPipelineDataRequestParams,
          },
        },
      },
      async (context, request, response) => {
        const disabledResponse = await assertWorkflowsEnabled({ context, response });
        if (disabledResponse) {
          return disabledResponse;
        }

        try {
          const { execution_id: executionId } = request.params;

          const { coreStart, pluginsStart } = await getStartServices();
          const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
          const eventLogIndex = await getEventLogIndex();

          const spaceId = getSpaceId({
            request,
            spaces: pluginsStart.spaces?.spacesService,
          });

          workflowInitService.ensureWorkflowsForSpace({ logger, request, spaceId }).catch((err) => {
            logger.debug(
              () =>
                `Background workflow initialization failed for space '${spaceId}': ${err.message}`
            );
          });

          // Step 1: Reconstruct WorkflowExecutionsTracking from event log
          const tracking = await getWorkflowExecutionsTracking({
            esClient,
            eventLogIndex,
            executionId,
          });

          if (tracking == null) {
            return response.notFound({
              body: { message: `Execution ${executionId} not found in event log` },
            });
          }

          if (workflowsManagementApi == null) {
            return response.customError({
              body: { message: 'WorkflowsManagement API is not available' },
              statusCode: 503,
            });
          }

          // Step 2: Extract alert retrieval data
          const alertRetrievalEntries =
            tracking.alertRetrieval != null
              ? await Promise.all(
                  tracking.alertRetrieval.map(async (entry) => {
                    const execution = await workflowsManagementApi.getWorkflowExecution(
                      entry.workflowRunId,
                      spaceId,
                      { includeInput: true, includeOutput: true }
                    );

                    if (execution == null) return null;

                    try {
                      const data = extractPipelineAlertData({
                        apiConfig: FALLBACK_API_CONFIG,
                        execution,
                        workflowId: entry.workflowId,
                        workflowRunId: entry.workflowRunId,
                      });

                      return {
                        ...data,
                        workflow_id: entry.workflowId,
                        workflow_run_id: entry.workflowRunId,
                      };
                    } catch (extractionError) {
                      logger.warn(
                        `Failed to extract alert data for workflow ${entry.workflowId}: ${
                          extractionError instanceof Error
                            ? extractionError.message
                            : String(extractionError)
                        }`
                      );
                      return null;
                    }
                  })
                )
              : null;

          const nonNullEntries = alertRetrievalEntries?.filter(
            (e): e is AlertRetrievalPipelineDataResponse => e !== null
          );
          const alertRetrievalData =
            nonNullEntries != null && nonNullEntries.length > 0 ? nonNullEntries : null;

          // Step 3: Extract generation data from generation workflow
          const generationTracking = tracking.generation;
          const generationData: PipelineGenerationData | null =
            generationTracking != null
              ? await workflowsManagementApi
                  .getWorkflowExecution(generationTracking.workflowRunId, spaceId, {
                    includeOutput: true,
                  })
                  .then((generationExecution) =>
                    extractPipelineGenerationData({ generationExecution })
                  )
                  .catch((generationError) => {
                    logger.warn(
                      `Failed to extract generation data from generation workflow ${
                        generationTracking.workflowId
                      }: ${
                        generationError instanceof Error
                          ? generationError.message
                          : String(generationError)
                      }`
                    );
                    return null;
                  })
              : null;

          // Step 4: Extract validation data
          const validationTracking = tracking.validation;
          const validationData: AttackDiscoveryApiAlert[] | null =
            validationTracking != null
              ? await workflowsManagementApi
                  .getWorkflowExecution(validationTracking.workflowRunId, spaceId, {
                    includeOutput: true,
                  })
                  .then((validationExecution) =>
                    extractPipelineValidationData({ execution: validationExecution })
                  )
                  .catch((validationError) => {
                    logger.warn(
                      `Failed to extract validation data from workflow ${
                        validationTracking.workflowId
                      }: ${
                        validationError instanceof Error
                          ? validationError.message
                          : String(validationError)
                      }`
                    );
                    return null;
                  })
              : null;

          // Step 5: Compute combined alerts from all retrieval results
          const combinedAlerts =
            alertRetrievalData != null && alertRetrievalData.length > 0
              ? computeCombinedAlerts(alertRetrievalData)
              : null;

          const responseBody: GetPipelineDataResponse = {
            alert_retrieval: alertRetrievalData,
            combined_alerts: combinedAlerts,
            ...(tracking.diagnosticsContext != null
              ? { diagnostics_context: tracking.diagnosticsContext }
              : {}),
            generation: generationData,
            validated_discoveries: validationData,
            workflow_executions_tracking: toSnakeCaseTracking(tracking),
          };

          return response.ok({ body: responseBody });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Error fetching pipeline data: ${errorMessage}`);
          const error = transformError(err);

          return response.customError({
            body: {
              message: error.message,
            },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
