/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type {
  GetOnboardingResponse,
  OnboardingSuggestionsExecution,
  OnboardingSuggestionsStatus,
  StartOnboardingSuggestionsResponse,
} from '../../common/onboarding';
import { OnboardingUnavailableError } from './errors';
import { parseSuggestions } from './parse_suggestions';

export { OnboardingUnavailableError };

export interface OnboardingClientDeps {
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
}

/**
 * Onboarding state lives entirely in the executions of the onboarding suggestions workflow: the
 * latest execution's output holds the suggested first investigations.
 */
export interface OnboardingClient {
  get: (request: KibanaRequest) => Promise<GetOnboardingResponse>;
  /** Starts an exploration run of the investigation agent. */
  start: (request: KibanaRequest) => Promise<StartOnboardingSuggestionsResponse>;
}

const IN_PROGRESS_STATUSES = new Set([
  'pending',
  'waiting',
  'waiting_for_input',
  'waiting_for_child',
  'running',
  'queued',
]);

const toStatus = (status: string): OnboardingSuggestionsStatus => {
  if (IN_PROGRESS_STATUSES.has(status)) return 'running';
  return status === 'completed' ? 'succeeded' : 'failed';
};

const toExecutionResponse = (execution: WorkflowExecutionDto): OnboardingSuggestionsExecution => {
  const status = toStatus(execution.status);
  const output = (execution.context?.output ?? {}) as { suggestions?: unknown };
  return {
    execution_id: execution.id,
    status,
    started_at: execution.startedAt,
    finished_at: status === 'running' ? undefined : execution.finishedAt,
    error: execution.error?.message,
    suggestions: status === 'succeeded' ? parseSuggestions(output) : undefined,
  };
};

/** Creates the client for the per-space Nightshift onboarding state. */
export const createOnboardingClient = ({
  getDeps,
  logger,
}: {
  getDeps: () => OnboardingClientDeps;
  logger: Logger;
}): OnboardingClient => {
  const getSpaceId = (request: KibanaRequest): string =>
    getDeps().spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

  const getWorkflowsManagement = (): WorkflowsServerPluginSetup => {
    const { workflowsManagement } = getDeps();
    if (!workflowsManagement) {
      throw new OnboardingUnavailableError('Workflows are not available');
    }
    return workflowsManagement;
  };

  return {
    get: async (request) => {
      const { management } = getWorkflowsManagement();
      const spaceId = getSpaceId(request);
      const { results } = await management.getWorkflowExecutions(
        {
          request,
          workflowId: NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID,
          sortField: 'createdAt',
          sortOrder: 'desc',
          size: 1,
          omitStepRuns: true,
        },
        spaceId
      );
      const [latest] = results;
      if (!latest) return {};
      const execution = await management.getWorkflowExecution(latest.id, spaceId, {
        includeOutput: true,
        omitStepExecutions: true,
        request,
      });
      return execution ? { execution: toExecutionResponse(execution) } : {};
    },

    start: async (request) => {
      const { management } = getWorkflowsManagement();
      const spaceId = getSpaceId(request);
      const workflow = await management.getWorkflow(
        NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID,
        spaceId,
        request
      );
      if (!workflow?.definition) {
        throw new OnboardingUnavailableError('The onboarding workflow is not installed');
      }
      const executionId = await management.runWorkflow(
        { ...workflow, definition: workflow.definition },
        spaceId,
        {},
        request,
        'nightshift-onboarding'
      );
      logger.info(`Started onboarding suggestions, execution_id=${executionId}`);
      return { execution_id: executionId };
    },
  };
};
