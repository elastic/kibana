/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, CoreStart, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { v4 as uuidv4 } from 'uuid';
import { executeGenerationWorkflow } from '@kbn/discoveries/impl/attack_discovery/generation/execute_generation_workflow';
import type { WorkflowConfig } from '@kbn/discoveries/impl/attack_discovery/generation/types';
import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';

import { RunStepCommonDefinition } from '../../../../common/step_types/run_step';
import { getAlertsIndexForSpace } from '../../../lib/get_alerts_index_for_space';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';
import { resolveDefaultConnectorId } from '../../helpers/resolve_default_connector_id';
import { checkManagedWorkflowIntegrity } from '../../../managed_workflows/check_managed_workflow_integrity';
import { ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS } from './constants';

const SOFT_DEADLINE_SENTINEL = Symbol('attack-discovery-run-soft-deadline');
type SoftDeadlineSentinel = typeof SOFT_DEADLINE_SENTINEL;

/**
 * Server-side implementation of the Attack Discovery run step.
 *
 * Orchestrates the full pipeline (alert retrieval → generation → validation)
 * in a single workflow step. Supports sync mode (returns discoveries inline)
 * and async mode (fire-and-forget, returns execution_uuid only).
 *
 * The `replacements` map is explicitly excluded from the output for security.
 */
export const getRunStepDefinition = ({
  analytics,
  getEventLogIndex,
  getEventLogger,
  getStartServices,
  logger,
  workflowsManagementApi,
}: {
  analytics?: AnalyticsServiceSetup;
  getEventLogIndex: () => Promise<string>;
  getEventLogger: () => Promise<IEventLogger>;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
  workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
}) =>
  createServerStepDefinition({
    ...RunStepCommonDefinition,
    handler: async (context) => {
      try {
        // The workflow engine does NOT apply the step schema's zod `.default()`
        // values to `context.input`, so defaulted fields arrive `undefined` when
        // the caller omits them. Mirror the `RunStepInputSchema` defaults here so
        // the documented "all inputs optional" contract holds for every path.
        const {
          additional_context: additionalContext,
          alert_retrieval_mode: alertRetrievalMode = 'custom_query',
          alert_retrieval_workflow_ids: alertRetrievalWorkflowIds = [],
          alerts,
          connector_id: connectorId,
          end,
          esql_query: esqlQuery,
          filter,
          mode = 'sync',
          size = 100,
          start,
          validation_workflow_id: validationWorkflowId = '',
        } = context.input;

        const executionUuid = uuidv4();

        const { coreStart, pluginsStart } = await getStartServices();
        const request = context.contextManager.getFakeRequest();

        // Resolve the space from the (space-scoped) fake request the same way
        // `executeGenerationWorkflow` does for its authorization guard, so the
        // alerts index is bounded to the schedule's space rather than `-default`.
        const spaceId = getSpaceId({
          request,
          spaces: pluginsStart.spaces?.spacesService,
        });

        const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);

        const effectiveConnectorId = connectorId
          ? connectorId
          : await resolveDefaultConnectorId({
              inference: pluginsStart.inference,
              logger,
              request,
              uiSettingsClient: coreStart.uiSettings.asScopedToClient(
                coreStart.savedObjects.getScopedClient(request)
              ),
            });

        context.logger.info(
          `Starting Attack Discovery run step (mode=${mode}, connector=${effectiveConnectorId})`
        );

        const { actionTypeId } = await resolveConnectorDetails({
          actionsClient,
          connectorId: effectiveConnectorId,
          inference: pluginsStart.inference,
          logger,
          request,
        });

        const apiConfig = {
          action_type_id: actionTypeId,
          connector_id: effectiveConnectorId,
        };

        // Pre-supplied alerts are passed directly via `executeParams.alerts`, so
        // the retrieval phase is skipped; otherwise the legacy run-step input
        // enum is bridged to the composite toggles (legacy `custom_only` =>
        // default retrieval off).
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
          request,
          size,
          start,
          trigger: 'workflow',
          type: 'attack_discovery',
          workflowConfig,
          workflowsManagementApi,
        };

        if (mode === 'async') {
          executeGenerationWorkflow(executeParams).catch((err) => {
            logger.error(
              `Async Attack Discovery run failed (execution=${executionUuid}): ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          });

          return {
            output: {
              execution_uuid: executionUuid,
              status: 'pending' as const,
            },
          };
        }

        // sync mode races the pipeline against a soft deadline (see constants.ts).
        // If the pipeline doesn't finish in time, return execution_uuid only and
        // let the pipeline keep running in the background — the AB workflow tool
        // wrapper then receives a clean response well inside its own 120s ceiling,
        // and the agent resumes via the dedicated AD status tool.
        const pipelinePromise = executeGenerationWorkflow(executeParams);

        let softDeadlineTimer: NodeJS.Timeout | undefined;
        const softDeadlinePromise = new Promise<SoftDeadlineSentinel>((resolve) => {
          softDeadlineTimer = setTimeout(
            () => resolve(SOFT_DEADLINE_SENTINEL),
            ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS
          );
        });

        try {
          const raced = await Promise.race([pipelinePromise, softDeadlinePromise]);

          if (raced === SOFT_DEADLINE_SENTINEL) {
            context.logger.info(
              `Attack Discovery sync pipeline exceeded soft deadline of ${ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS}ms; returning execution_uuid for slow-path resume (execution=${executionUuid})`
            );

            // The pipeline keeps running in the background; surface any later
            // rejection so it doesn't surface as an unhandled promise rejection.
            pipelinePromise.catch((err) => {
              logger.error(
                `Attack Discovery sync pipeline rejected after returning early (execution=${executionUuid}): ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            });

            return {
              output: {
                execution_uuid: executionUuid,
                status: 'pending' as const,
              },
            };
          }

          const outcome = raced;

          if (outcome.outcome === 'validation_succeeded') {
            const { alertRetrievalResult, generationResult, validationResult } = outcome;

            return {
              output: {
                alerts_context_count: alertRetrievalResult.alertsContextCount,
                // R3: the run step persists via the persist step and returns exactly the
                // discoveries it was handed (`[]` when the persist step did not run).
                attack_discoveries: (validationResult.discoveriesToPersist ?? []) as Array<{
                  alert_ids: string[];
                  details_markdown: string;
                  entity_summary_markdown?: string;
                  id?: string;
                  mitre_attack_tactics?: string[];
                  summary_markdown: string;
                  timestamp?: string;
                  title: string;
                }>,
                discovery_count: validationResult.generatedCount,
                execution_uuid: generationResult.executionUuid,
                status: 'completed' as const,
              },
            };
          }

          context.logger.warn(`Attack Discovery validation failed (execution=${executionUuid})`);

          return {
            output: {
              alerts_context_count: 0,
              attack_discoveries: null,
              discovery_count: 0,
              execution_uuid: executionUuid,
              status: 'completed' as const,
            },
          };
        } finally {
          // Always clear the soft-deadline timer so it does not leak into the
          // event loop when the pipeline promise rejects (the timer would
          // otherwise stay pending until it fired). This also covers the
          // success and soft-deadline-exceeded paths.
          if (softDeadlineTimer != null) {
            clearTimeout(softDeadlineTimer);
          }
        }
      } catch (error) {
        context.logger.error(
          `Attack Discovery run step failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          error instanceof Error ? error : undefined
        );

        return {
          error: new Error(
            error instanceof Error ? error.message : 'Attack Discovery run step failed'
          ),
        };
      }
    },
  });
