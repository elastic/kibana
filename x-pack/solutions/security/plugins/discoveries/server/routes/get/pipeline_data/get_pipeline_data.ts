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
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';
import type {
  DiagnosticsContext,
  WorkflowExecutionsTracking,
} from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';

import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import type { WorkflowsManagementApi } from '@kbn/discoveries/impl/attack_discovery/generation/types';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { computeCombinedAlerts, type CombinedAlerts } from './helpers/compute_combined_alerts';
import {
  extractPipelineAlertData,
  type ExtractionStrategy,
} from './helpers/extract_pipeline_alert_data';
import { extractPipelineGateData } from './helpers/extract_pipeline_gate_data';
import {
  extractPipelineGenerationData,
  type PipelineGenerationData,
} from './helpers/extract_pipeline_generation_data';
import { extractPipelineValidationData } from './helpers/extract_pipeline_validation_data';
import { getWorkflowExecutionsTracking } from './helpers/get_workflow_executions_tracking';

const ROUTE_PATH = '/internal/attack_discovery/workflow/{workflow_id}/execution/{execution_id}';

/** Zod schema for validating path parameters */
export const GetPipelineDataRequestParams = z.object({
  execution_id: z.string().max(1024),
  workflow_id: z.string().max(1024),
});

/** Zod schema for validating optional query parameters */
export const GetPipelineDataRequestQuery = z.object({
  /** Fallback generation workflow run ID — used by the client when the event
   *  log hasn't been indexed yet (provided mode / early polling). */
  generation_workflow_run_id: z.string().max(1024).optional(),
});

/** snake_case response shape for a single workflow execution tracking entry */
interface WorkflowExecutionTrackingResponse {
  workflow_id: string;
  workflow_run_id: string;
}

/** snake_case response shape for all workflow execution tracking */
interface WorkflowExecutionsTrackingResponse {
  alert_retrieval: WorkflowExecutionTrackingResponse[] | null;
  /** Generation-phase gate (skill) runs, surfaced under the Generation phase. */
  gate: WorkflowExecutionTrackingResponse[] | null;
  generation: WorkflowExecutionTrackingResponse | null;
  validation: WorkflowExecutionTrackingResponse | null;
}

/** Per-workflow alert retrieval data in the response */
export interface AlertRetrievalPipelineDataResponse {
  alerts: string[];
  alerts_context_count: number | null;
  /** Count of custom-workflow alerts that lack a recoverable backing `_id` (C2). */
  alerts_missing_id_count?: number;
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
  gate:
    tracking.gate?.map((entry) => ({
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
    workflowsManagementApi,
  }: {
    getEventLogIndex: () => Promise<string>;
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
    workflowsManagementApi?: WorkflowsManagementApi;
  }
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: [
            ATTACK_DISCOVERY_API_ACTION_ALL,
            ALERTS_API_READ,
            WorkflowsManagementApiActions.read,
          ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: GetPipelineDataRequestParams,
            query: GetPipelineDataRequestQuery,
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
          const { generation_workflow_run_id: clientGenerationWorkflowRunId } = request.query;

          const { coreStart, pluginsStart } = await getStartServices();
          const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
          const eventLogIndex = await getEventLogIndex();

          // Object-level authorization: reads are bound to the requesting
          // principal so a caller cannot read another user's execution by id
          // within the same space. Without a principal we cannot enforce
          // ownership, so reject.
          const username = coreStart.security.authc.getCurrentUser(request)?.username;
          if (username == null) {
            return response.forbidden({
              body: { message: 'Unable to determine the requesting user' },
            });
          }

          const spaceId = getSpaceId({
            request,
            spaces: pluginsStart.spaces?.spacesService,
          });

          // Step 1: Reconstruct WorkflowExecutionsTracking from event log
          const tracking = await getWorkflowExecutionsTracking({
            esClient,
            eventLogIndex,
            executionId,
            spaceId,
            username,
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
          let alertRetrievalData: AlertRetrievalPipelineDataResponse[] | null =
            nonNullEntries != null && nonNullEntries.length > 0 ? nonNullEntries : null;

          // Step 2b: Extract generation-phase gate (skill) data. The `gate` bucket
          // holds a SINGLE entry: the gate (skill) decision run. Any net-new alert
          // re-fetch the gate triggers is folded into that run (see `runGatePhase`)
          // so each workflow execution is one entry under the Generation phase. For
          // the completed decision run we surface a gate-aware count (kept + added
          // ids, B1) so its badge is accurate; the gate emits ids only, so it
          // carries no raw alerts. Before the decision completes, `extractPipelineGateData`
          // returns null and we fall back to standard alert extraction. This entry is
          // keyed by workflow_run_id so the gate sub-step badge/inspect resolve, but it
          // is kept OUT of the combined alert-retrieval computation (the Alert retrieval phase).
          const gateEntries =
            tracking.gate != null
              ? await Promise.all(
                  tracking.gate.map(async (entry) => {
                    const execution = await workflowsManagementApi.getWorkflowExecution(
                      entry.workflowRunId,
                      spaceId,
                      { includeInput: true, includeOutput: true }
                    );

                    if (execution == null) return null;

                    const gateData = extractPipelineGateData({ execution, logger });

                    if (gateData != null) {
                      return {
                        ...gateData,
                        workflow_id: entry.workflowId,
                        workflow_run_id: entry.workflowRunId,
                      };
                    }

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
                        `Failed to extract gate data for workflow ${entry.workflowId}: ${
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

          const gateData =
            gateEntries?.filter((e): e is AlertRetrievalPipelineDataResponse => e !== null) ?? [];

          // Step 3: Extract generation data from generation workflow.
          // When alert_retrieval_mode is 'provided', also fetch the generation step's
          // input so Step 2.5 can reconstruct the alert retrieval data from the
          // pre-provided alerts.
          //
          // Fallback: When the event log hasn't been indexed yet (early polling), the
          // client can pass the generation workflow run ID as a query parameter.
          const generationTracking =
            tracking.generation ??
            (clientGenerationWorkflowRunId != null
              ? {
                  workflowId: clientGenerationWorkflowRunId,
                  workflowRunId: clientGenerationWorkflowRunId,
                }
              : null);
          const isProvidedMode =
            tracking.diagnosticsContext?.config?.alertRetrievalMode === 'provided';

          // Always fetch step inputs so we can extract the actual alerts the
          // generate step received from the 'generate_discoveries' step's
          // input.alerts field. These are the REAL events passed to generation —
          // used both to surface them on the gate (skill) inspect (Step 5b) and to
          // reconstruct provided-mode alert retrieval (Step 2.5).
          // Note: includeInput controls _step execution_ inputs, not workflow-level input.
          let generationStepAlerts: string[] | null = null;
          const generationData: PipelineGenerationData | null =
            generationTracking != null
              ? await workflowsManagementApi
                  .getWorkflowExecution(generationTracking.workflowRunId, spaceId, {
                    includeInput: true,
                    includeOutput: true,
                  })
                  .then((generationExecution) => {
                    if (generationExecution != null) {
                      // Find the 'generate_discoveries' step execution and extract alerts
                      // from its input. The generation workflow YAML maps
                      // `inputs.additional_alerts` → step `with.alerts`, so the step
                      // execution's input contains `alerts: string[]`.
                      //
                      // Note: the execution engine wraps every step in a `step_level_timeout`
                      // scope that shares the same `stepId` but has no `input` field.
                      // We must skip that wrapper and find the inner step that actually
                      // carries the resolved inputs.
                      const generateStep = generationExecution.stepExecutions?.find(
                        (step) => step.stepId === 'generate_discoveries' && step.input != null
                      );
                      const stepInput = generateStep?.input as Record<string, unknown> | undefined;
                      const alerts = stepInput?.alerts;

                      if (Array.isArray(alerts) && alerts.length > 0) {
                        generationStepAlerts = alerts as string[];
                      }

                      logger.debug(
                        () =>
                          `Found generate_discoveries step=${generateStep != null}, alertsCount=${
                            Array.isArray(alerts) ? alerts.length : 'N/A'
                          }`
                      );
                    }
                    return extractPipelineGenerationData({ generationExecution });
                  })
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

          // Step 2.5: For 'provided' mode, reconstruct alert retrieval data from either:
          // (a) the generation step's input (available after the step completes), or
          // (b) the event log tracking data written at generate-step-started time
          //     (available immediately during the running state, before step.input is populated).
          // This surfaces the provided alerts in the Alert Retrieval section of the flyout
          // both while the generation is running AND after it completes.
          const effectiveProvidedAlerts: string[] | null =
            generationStepAlerts ?? tracking.providedAlerts ?? null;

          if (
            alertRetrievalData == null &&
            isProvidedMode &&
            Array.isArray(effectiveProvidedAlerts) &&
            effectiveProvidedAlerts.length > 0
          ) {
            // Assign to a const to satisfy TS narrowing — `let` variables
            // mutated in closures are widened back to `T | null`.
            const providedAlerts: string[] = effectiveProvidedAlerts;

            alertRetrievalData = [
              {
                alerts: providedAlerts,
                alerts_context_count: providedAlerts.length,
                extraction_strategy: 'provided',
                workflow_id: 'provided',
                workflow_run_id: 'provided',
              },
            ];
          }

          // Step 4: Extract validation data
          // includeInput: true is required so getScheduledInputDiscoveries can
          // read the persist step's input.attack_discoveries in scheduled mode.
          const validationTracking = tracking.validation;
          const validationData: AttackDiscoveryApiAlert[] | null =
            validationTracking != null
              ? await workflowsManagementApi
                  .getWorkflowExecution(validationTracking.workflowRunId, spaceId, {
                    includeInput: true,
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

          // Step 5: Compute combined alerts from the Alert-retrieval-phase results
          // only (gate entries belong to the Generation phase and are excluded so
          // the "Combined alert retrieval" view stays scoped to alert retrieval).
          const combinedAlerts =
            alertRetrievalData != null && alertRetrievalData.length > 0
              ? computeCombinedAlerts(alertRetrievalData)
              : null;

          // Step 5b: Attach the REAL events passed to generation to the gate
          // (skill) entry. The gate emits ids only, so on its own it carries no
          // raw alerts (inspect would be disabled). The authoritative set of
          // alerts generation actually received is the generate step's
          // `input.alerts` — the kept candidates passed through as-is (including
          // alerts from any alert-retrieval workflow) plus any net-new the gate
          // added. Sourcing inspect from the generate step input guarantees it
          // always reflects exactly what generation analyzed. The count is set to
          // match so the badge and inspect agree; until the generate step input is
          // available the gate-aware (kept + added) count from Step 2b stands.
          // Cast required because TS control-flow narrows the `let` to `null`
          // (it cannot see the assignment made inside the `.then` callback above).
          const generationInputAlerts = generationStepAlerts as string[] | null;
          const gateDataWithGenerationAlerts: AlertRetrievalPipelineDataResponse[] = gateData.map(
            (entry) =>
              entry.extraction_strategy === 'skill' && Array.isArray(generationInputAlerts)
                ? {
                    ...entry,
                    alerts: generationInputAlerts,
                    alerts_context_count: generationInputAlerts.length,
                  }
                : entry
          );

          // Merge the gate entries into alert_retrieval so the gate sub-step's
          // badge/inspect (keyed by workflow_run_id) resolve under the Generation
          // phase, without affecting the combined alert-retrieval computation above.
          const allRetrievalData: AlertRetrievalPipelineDataResponse[] | null =
            alertRetrievalData != null || gateDataWithGenerationAlerts.length > 0
              ? [...(alertRetrievalData ?? []), ...gateDataWithGenerationAlerts]
              : null;

          const responseBody: GetPipelineDataResponse = {
            alert_retrieval: allRetrievalData,
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
