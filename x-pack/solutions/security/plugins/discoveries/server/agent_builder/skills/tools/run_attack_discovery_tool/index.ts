/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, CoreStart, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { executeGenerationWorkflow } from '@kbn/discoveries/impl/attack_discovery/generation/execute_generation_workflow';
import type { WorkflowConfig } from '@kbn/discoveries/impl/attack_discovery/generation/types';
import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import { z } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';

import { getAlertsIndexForSpace } from '../../../../lib/get_alerts_index_for_space';
import { isWorkflowsEnabledForSpace } from '../../../../lib/is_workflows_enabled_for_space';
import type { DiscoveriesPluginStartDeps } from '../../../../types';
import { checkManagedWorkflowIntegrity } from '../../../../managed_workflows/check_managed_workflow_integrity';
import { resolveConnectorDetails } from '../../../../workflows/helpers/resolve_connector_details';
import { ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS } from '../../../../workflows/steps/run_step/constants';

export const RUN_ATTACK_DISCOVERY_TOOL_ID = 'security.attack-discovery.run';

const SOFT_DEADLINE_SENTINEL = Symbol('attack-discovery-run-soft-deadline');
type SoftDeadlineSentinel = typeof SOFT_DEADLINE_SENTINEL;

export interface RunAttackDiscoveryToolDeps {
  analytics?: AnalyticsServiceSetup;
  getEventLogIndex: () => Promise<string>;
  getEventLogger: () => Promise<IEventLogger>;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
  workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
}

const inputSchema = z.object({
  additional_context: z
    .string()
    .optional()
    .describe(
      'Optional analyst context that should be appended to the prompt sent to the LLM during generation.'
    ),
  alert_retrieval_mode: z
    .enum(['custom_only', 'custom_query', 'esql', 'provided'])
    .optional()
    .default('custom_query')
    .describe(
      'Retrieval strategy. Auto-detected as "provided" when `alerts` is non-empty. Otherwise: "esql" (use `esql_query`), "custom_only" (use `alert_retrieval_workflow_ids`), "custom_query" (last resort; always pair with explicit `size`, `start`, `end`).'
    ),
  alert_retrieval_workflow_ids: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      'Custom alert-retrieval workflow IDs to merge into the generation input. Use with `alert_retrieval_mode: "custom_only"` or to extend `esql` mode.'
    ),
  alerts: z
    .array(z.string())
    .optional()
    .describe(
      'Pre-curated alert text strings (preferred). When non-empty, the pipeline skips retrieval and uses these directly.'
    ),
  connector_id: z
    .string()
    .optional()
    .describe(
      'Optional override for the LLM connector ID. When omitted, the tool uses the connector resolved for the agent execution.'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'End of the alert-retrieval time range, when using `custom_query` mode. Datemath expression, e.g. "now".'
    ),
  esql_query: z.string().optional().describe('ES|QL query for the `esql` retrieval mode.'),
  filter: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Elasticsearch DSL filter for the `custom_query` retrieval mode (e.g. `{ "term": { "kibana.alert.severity": "critical" } }`).'
    ),
  mode: z
    .enum(['async', 'sync'])
    .optional()
    .default('sync')
    .describe(
      '"sync" returns inline discoveries when the pipeline finishes inside the soft deadline; "async" returns `execution_uuid` immediately without awaiting.'
    ),
  size: z
    .number()
    .int()
    .optional()
    .default(100)
    .describe('Maximum number of alerts to retrieve in `custom_query` mode.'),
  start: z
    .string()
    .optional()
    .describe(
      'Start of the alert-retrieval time range, when using `custom_query` mode. Datemath expression, e.g. "now-24h".'
    ),
  validation_workflow_id: z
    .string()
    .optional()
    .default('')
    .describe(
      'Optional override for the validation workflow ID. Empty string uses the default validation workflow.'
    ),
});

const buildErrorResult = (message: string) => ({
  data: { message },
  tool_result_id: getToolResultId(),
  type: ToolResultType.error,
});

const buildSuccessResult = (data: Record<string, unknown>) => ({
  data,
  tool_result_id: getToolResultId(),
  type: ToolResultType.other,
});

const resolveEffectiveConnectorId = async ({
  args,
  context,
  logger,
}: {
  args: { connector_id?: string };
  context: ToolHandlerContext;
  logger: Logger;
}): Promise<string | undefined> => {
  if (args.connector_id != null && args.connector_id.length > 0) {
    return args.connector_id;
  }

  try {
    const { connector } = await context.modelProvider.getDefaultModel();
    return connector.connectorId;
  } catch (error) {
    logger.error(
      `Attack Discovery tool failed to resolve a default LLM connector from the agent's selected model: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};

export const getRunAttackDiscoveryTool = ({
  analytics,
  getEventLogIndex,
  getEventLogger,
  getStartServices,
  logger,
  workflowsManagementApi,
}: RunAttackDiscoveryToolDeps): BuiltinSkillBoundedTool<typeof inputSchema> => ({
  description: `Run the canonical Attack Discovery generation pipeline (alert retrieval → generation → validation → persistence) inside the audited Anonymization Boundary. Prefer "provided" mode (pass curated \`alerts\`) when you have already gathered evidence; otherwise use "esql" with \`esql_query\`, "custom_only" with \`alert_retrieval_workflow_ids\`, or "custom_query" with explicit \`size\`/\`start\`/\`end\`. Every result includes a \`status\` field: \`status: 'completed'\` means the run finished and \`attack_discoveries\`/\`discovery_count\` are final (\`discovery_count: 0\` genuinely means zero discoveries); \`status: 'pending'\` means the run is still executing in the background and only \`execution_uuid\` is returned (async mode, or sync-mode exceeding the soft deadline) — poll \`security.attack-discovery.get_status\` with the \`execution_uuid\` and NEVER report "0 discoveries" for a pending run. The LLM connector is resolved from the agent execution; pass \`connector_id\` only to override.`,
  handler: async (args, context) => {
    const effectiveConnectorId = await resolveEffectiveConnectorId({ args, context, logger });

    if (effectiveConnectorId == null || effectiveConnectorId.length === 0) {
      return {
        results: [
          buildErrorResult(
            'No LLM connector is available for this Attack Discovery run. The agent execution did not resolve a default connector and no `connector_id` was supplied.'
          ),
        ],
      };
    }

    const executionUuid = uuidv4();
    const {
      additional_context: additionalContext,
      alert_retrieval_mode: alertRetrievalMode,
      alert_retrieval_workflow_ids: alertRetrievalWorkflowIds = [],
      alerts,
      end,
      esql_query: esqlQuery,
      filter,
      mode,
      size,
      start,
      validation_workflow_id: validationWorkflowId,
    } = args;

    try {
      const { coreStart, pluginsStart } = await getStartServices();

      if (
        !(await isWorkflowsEnabledForSpace({
          featureFlags: coreStart.featureFlags,
          uiSettingsClient: coreStart.uiSettings.asScopedToClient(context.savedObjectsClient),
        }))
      ) {
        return {
          results: [buildErrorResult('Attack Discovery workflows are not enabled for this space.')],
        };
      }

      // Resolve the space the same way `executeGenerationWorkflow` does for its
      // authorization guard, so the alerts index is bounded to the caller's own
      // space rather than hardcoded to `-default`.
      const spaceId = getSpaceId({
        request: context.request,
        spaces: pluginsStart.spaces?.spacesService,
      });

      const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(context.request);

      const { actionTypeId } = await resolveConnectorDetails({
        actionsClient,
        connectorId: effectiveConnectorId,
        inference: pluginsStart.inference,
        logger,
        request: context.request,
      });

      const apiConfig = {
        action_type_id: actionTypeId,
        connector_id: effectiveConnectorId,
      };

      // Pre-supplied alerts are passed directly via `executeParams.alerts`, so
      // the retrieval phase is skipped; otherwise the legacy tool input enum is
      // bridged to the composite toggles (legacy `custom_only` => default
      // retrieval off).
      const hasProvidedAlerts = alerts != null && alerts.length > 0;
      const queryMode = alertRetrievalMode === 'esql' ? 'esql' : 'custom_query';

      const workflowConfig: WorkflowConfig = {
        ...(additionalContext != null ? { additional_context: additionalContext } : {}),
        alert_retrieval_mode: queryMode,
        alert_retrieval_workflow_ids: alertRetrievalWorkflowIds,
        alert_retrieval_workflows_enabled: alertRetrievalWorkflowIds.length > 0,
        default_retrieval_enabled: !hasProvidedAlerts && alertRetrievalMode !== 'custom_only',
        ...(esqlQuery != null ? { esql_query: esqlQuery } : {}),
        skill_enabled: true,
        validation_workflow_id: validationWorkflowId,
      };

      const executeParams = {
        ...(alerts != null && alerts.length > 0 ? { alerts } : {}),
        alertsIndexPattern: getAlertsIndexForSpace(spaceId),
        analytics,
        apiConfig,
        authz: pluginsStart.security.authz,
        checkIntegrity:
          workflowsManagementApi != null
            ? async ({
                logger: checkLogger,
                spaceId: checkSpaceId,
              }: {
                logger: Logger;
                spaceId: string;
              }) => {
                const { pluginsStart: startDeps } = await getStartServices();
                return checkManagedWorkflowIntegrity({
                  analytics,
                  logger: checkLogger,
                  spaceId: checkSpaceId,
                  workflowsExtensions: startDeps.workflowsExtensions,
                });
              }
            : undefined,
        end,
        executionUuid,
        filter,
        getEventLogIndex,
        getEventLogger,
        getStartServices: async () => {
          const services = await getStartServices();
          return {
            coreStart: services.coreStart,
            pluginsStart: services.pluginsStart as unknown,
          };
        },
        logger,
        request: context.request,
        size,
        start,
        trigger: 'agent_builder',
        type: 'attack_discovery',
        workflowConfig,
        workflowsManagementApi,
      };

      if (mode === 'async') {
        executeGenerationWorkflow(executeParams).catch((err) => {
          logger.error(
            `Async Attack Discovery tool run failed (execution=${executionUuid}): ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        });

        return {
          results: [buildSuccessResult({ execution_uuid: executionUuid, status: 'pending' })],
        };
      }

      const pipelinePromise = executeGenerationWorkflow(executeParams);

      const softDeadlinePromise = new Promise<SoftDeadlineSentinel>((resolve) => {
        setTimeout(() => resolve(SOFT_DEADLINE_SENTINEL), ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS);
      });

      const raced = await Promise.race([pipelinePromise, softDeadlinePromise]);

      if (raced === SOFT_DEADLINE_SENTINEL) {
        logger.info(
          `Attack Discovery tool sync pipeline exceeded soft deadline of ${ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS}ms; returning execution_uuid for slow-path resume (execution=${executionUuid})`
        );

        pipelinePromise.catch((err) => {
          logger.error(
            `Attack Discovery tool sync pipeline rejected after returning early (execution=${executionUuid}): ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        });

        return {
          results: [buildSuccessResult({ execution_uuid: executionUuid, status: 'pending' })],
        };
      }

      if (raced.outcome === 'validation_succeeded') {
        const { alertRetrievalResult, generationResult, validationResult } = raced;

        return {
          results: [
            buildSuccessResult({
              alerts_context_count: alertRetrievalResult.alertsContextCount,
              attack_discoveries: generationResult.attackDiscoveries,
              discovery_count: validationResult.generatedCount,
              execution_uuid: generationResult.executionUuid,
              status: 'completed',
            }),
          ],
        };
      }

      logger.warn(`Attack Discovery tool validation failed (execution=${executionUuid})`);

      return {
        results: [
          buildSuccessResult({
            alerts_context_count: 0,
            attack_discoveries: null,
            discovery_count: 0,
            execution_uuid: executionUuid,
            status: 'completed',
          }),
        ],
      };
    } catch (error) {
      logger.error(
        `Attack Discovery tool run failed (execution=${executionUuid}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return {
        results: [
          buildErrorResult(
            `Failed to run Attack Discovery: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          ),
        ],
      };
    }
  },
  id: RUN_ATTACK_DISCOVERY_TOOL_ID,
  schema: inputSchema,
  type: ToolType.builtin,
});
