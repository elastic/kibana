/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';

import { StatusStepCommonDefinition } from '../../../../common/step_types/status_step';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { authenticateAndGetSpace } from '../default_validation_step/helpers/authenticate_and_get_space';
import { extractPipelineValidationData } from '../../../routes/get/pipeline_data/helpers/extract_pipeline_validation_data';
import { getWorkflowExecutionsTracking } from '../../../routes/get/pipeline_data/helpers/get_workflow_executions_tracking';

const isFailedStatus = (status: ExecutionStatus): boolean =>
  status === ExecutionStatus.FAILED ||
  status === ExecutionStatus.CANCELLED ||
  status === ExecutionStatus.TIMED_OUT;

const toErrorMessage = (error: WorkflowExecutionDto['error']): string | null => {
  if (error == null) {
    return null;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return null;
};

/**
 * Server-side implementation of the Attack Discovery status step.
 *
 * Resolves an in-flight (or completed) generation by its `execution_uuid` by
 * reading the workflow event log — the same path the Agent Builder status tool
 * uses. When the validation phase has completed it returns the persisted
 * discoveries, letting a workflow poll (e.g. a `while` loop) resume the slow
 * path after the run step returned early with `status: 'pending'`.
 */
export const getStatusStepDefinition = ({
  getEventLogIndex,
  getStartServices,
  logger,
  workflowsManagementApi,
}: {
  getEventLogIndex: () => Promise<string>;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
  workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
}) =>
  createServerStepDefinition({
    ...StatusStepCommonDefinition,
    handler: async (context) => {
      const { execution_uuid: executionUuid } = context.input;

      const running = (phase: 'alert_retrieval' | 'generation' | 'validation') => ({
        output: {
          attack_discoveries: null,
          discovery_count: 0,
          error_message: null,
          execution_uuid: executionUuid,
          phase,
          status: 'running' as const,
        },
      });

      try {
        const { coreStart, pluginsStart } = await getStartServices();
        const request = context.contextManager.getFakeRequest();

        // Reuse the pipeline auth helper: reads are bound to the executing
        // principal so one run's status cannot be read via another's id.
        const { authenticatedUser, esClient, spaceId } = await authenticateAndGetSpace({
          coreStart,
          pluginsStart,
          request,
        });

        const eventLogIndex = await getEventLogIndex();

        const tracking = await getWorkflowExecutionsTracking({
          esClient,
          eventLogIndex,
          executionId: executionUuid,
          spaceId,
          username: authenticatedUser.username,
        });

        if (tracking == null) {
          return {
            output: {
              attack_discoveries: null,
              discovery_count: 0,
              error_message: null,
              execution_uuid: executionUuid,
              phase: null,
              status: 'not_found' as const,
            },
          };
        }

        if (tracking.validation != null) {
          const validationExecution =
            (await workflowsManagementApi?.getWorkflowExecution(
              tracking.validation.workflowRunId,
              spaceId,
              { includeOutput: true }
            )) ?? null;

          if (validationExecution == null) {
            return running('validation');
          }

          if (validationExecution.status === ExecutionStatus.COMPLETED) {
            const discoveries = extractPipelineValidationData({ execution: validationExecution });
            return {
              output: {
                attack_discoveries: discoveries ?? null,
                discovery_count: discoveries?.length ?? 0,
                error_message: null,
                execution_uuid: executionUuid,
                phase: 'validation' as const,
                status: 'succeeded' as const,
              },
            };
          }

          if (isFailedStatus(validationExecution.status)) {
            return {
              output: {
                attack_discoveries: null,
                discovery_count: 0,
                error_message: toErrorMessage(validationExecution.error),
                execution_uuid: executionUuid,
                phase: 'validation' as const,
                status: 'failed' as const,
              },
            };
          }

          return running('validation');
        }

        if (tracking.generation != null) {
          const generationExecution =
            (await workflowsManagementApi?.getWorkflowExecution(
              tracking.generation.workflowRunId,
              spaceId
            )) ?? null;

          if (generationExecution != null && isFailedStatus(generationExecution.status)) {
            return {
              output: {
                attack_discoveries: null,
                discovery_count: 0,
                error_message: toErrorMessage(generationExecution.error),
                execution_uuid: executionUuid,
                phase: 'generation' as const,
                status: 'failed' as const,
              },
            };
          }

          return running('generation');
        }

        return running('alert_retrieval');
      } catch (error) {
        context.logger.error(
          `Attack Discovery status step failed (execution=${executionUuid}): ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          error instanceof Error ? error : undefined
        );
        return {
          error: new Error(
            error instanceof Error ? error.message : 'Attack Discovery status step failed'
          ),
        };
      }
    },
  });
