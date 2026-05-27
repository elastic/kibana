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

import { RunStepCommonDefinition } from '../../../../common/step_types/run_step';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';
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
        const {
          additional_context: additionalContext,
          alert_retrieval_mode: alertRetrievalMode,
          alert_retrieval_workflow_ids: alertRetrievalWorkflowIds,
          alerts,
          connector_id: connectorId,
          end,
          esql_query: esqlQuery,
          filter,
          mode,
          size,
          start,
          validation_workflow_id: validationWorkflowId,
        } = context.input;

        const executionUuid = uuidv4();

        context.logger.info(
          `Starting Attack Discovery run step (mode=${mode}, connector=${connectorId})`
        );

        const { pluginsStart } = await getStartServices();
        const request = context.contextManager.getFakeRequest();

        const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);

        const { actionTypeId } = await resolveConnectorDetails({
          actionsClient,
          connectorId,
          inference: pluginsStart.inference,
          logger,
          request,
        });

        const apiConfig = {
          action_type_id: actionTypeId,
          connector_id: connectorId,
        };

        // Auto-detect 'provided' mode when alerts are pre-supplied
        const effectiveRetrievalMode =
          alerts != null && alerts.length > 0 ? 'provided' : alertRetrievalMode;

        const workflowConfig: WorkflowConfig = {
          ...(additionalContext != null ? { additional_context: additionalContext } : {}),
          alert_retrieval_mode: effectiveRetrievalMode,
          alert_retrieval_workflow_ids: alertRetrievalWorkflowIds,
          esql_query: esqlQuery,
          validation_workflow_id: validationWorkflowId,
        };

        const executeParams = {
          ...(alerts != null && alerts.length > 0 ? { alerts } : {}),
          alertsIndexPattern: '.alerts-security.alerts-default',
          analytics,
          apiConfig,
          checkIntegrity:
            workflowsManagementApi != null
              ? async ({ logger: checkLogger, spaceId }: { logger: Logger; spaceId: string }) => {
                  const { pluginsStart: startDeps } = await getStartServices();
                  return checkManagedWorkflowIntegrity({
                    analytics,
                    logger: checkLogger,
                    spaceId,
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
            },
          };
        }

        if (softDeadlineTimer != null) {
          clearTimeout(softDeadlineTimer);
        }

        const outcome = raced;

        if (outcome.outcome === 'validation_succeeded') {
          const { alertRetrievalResult, generationResult, validationResult } = outcome;

          return {
            output: {
              alerts_context_count: alertRetrievalResult.alertsContextCount,
              attack_discoveries: generationResult.attackDiscoveries as Array<{
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
          },
        };
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
