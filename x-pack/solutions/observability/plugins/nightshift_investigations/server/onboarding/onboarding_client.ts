/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  ONBOARDING_CONNECTOR_TYPE_ID,
  type GetOnboardingResponse,
  type OnboardingConnectorSummary,
  type OnboardingSuggestionsExecution,
  type OnboardingSuggestionsStatus,
  type StartOnboardingSuggestionsResponse,
} from '../../common/onboarding';
import { parseSuggestions } from './parse_suggestions';

import { OnboardingValidationError } from './errors';
import { OnboardingUnavailableError } from './unavailable_error';

export { OnboardingValidationError, OnboardingUnavailableError };

export interface OnboardingClientDeps {
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  actions?: ActionsPluginStart;
}

/**
 * Onboarding state lives entirely in the executions of the onboarding suggestions workflow: the
 * latest execution's inputs are the connected connectors, its output the suggestions.
 */
export interface OnboardingClient {
  get: (request: KibanaRequest) => Promise<GetOnboardingResponse>;
  /** Validates the connectors and starts a suggestions workflow execution for them. */
  start: (
    request: KibanaRequest,
    connectorIds: string[]
  ) => Promise<StartOnboardingSuggestionsResponse>;
  /** The first connector of the space's latest onboarding execution, if any. */
  getConnectorId: (request: KibanaRequest) => Promise<string | undefined>;
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

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const readConnectorIds = (execution: Pick<WorkflowExecutionDto, 'context'>): string[] => {
  const inputs = (execution.context?.inputs ?? {}) as { connector_ids?: unknown };
  return Array.isArray(inputs.connector_ids)
    ? inputs.connector_ids.filter((id): id is string => typeof id === 'string')
    : [];
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

  const getActionsClient = async (request: KibanaRequest) => {
    const { actions } = getDeps();
    if (!actions) {
      throw new OnboardingUnavailableError('Connectors are not available in this deployment');
    }
    return actions.getActionsClientWithRequest(request);
  };

  const getLatestExecution = async (
    request: KibanaRequest
  ): Promise<WorkflowExecutionDto | undefined> => {
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
    if (!latest) return undefined;
    const execution = await management.getWorkflowExecution(latest.id, spaceId, {
      includeInput: true,
      includeOutput: true,
      omitStepExecutions: true,
      request,
    });
    return execution ?? undefined;
  };

  const summarizeConnector = async (
    request: KibanaRequest,
    connectorId: string
  ): Promise<OnboardingConnectorSummary | undefined> => {
    try {
      const connector = await (await getActionsClient(request)).get({ id: connectorId });
      return {
        id: connector.id,
        name: connector.name,
        url: readString(connector.config?.url),
        kibana_url: readString(connector.config?.kibanaUrl),
      };
    } catch {
      // Deleted or no longer readable: the UI offers to connect again.
      return undefined;
    }
  };

  const toExecutionResponse = async (
    request: KibanaRequest,
    execution: WorkflowExecutionDto
  ): Promise<OnboardingSuggestionsExecution> => {
    const connectors = (
      await Promise.all(readConnectorIds(execution).map((id) => summarizeConnector(request, id)))
    ).filter((connector): connector is OnboardingConnectorSummary => Boolean(connector));
    const status = toStatus(execution.status);
    const output = (execution.context?.output ?? {}) as { suggestions?: unknown };
    return {
      execution_id: execution.id,
      status,
      started_at: execution.startedAt,
      finished_at: status === 'running' ? undefined : execution.finishedAt,
      error: execution.error?.message,
      connectors,
      suggestions: status === 'succeeded' ? parseSuggestions(output) : undefined,
    };
  };

  const validateConnector = async (request: KibanaRequest, connectorId: string) => {
    const actionsClient = await getActionsClient(request);
    let connector: Awaited<ReturnType<typeof actionsClient.get>>;
    try {
      connector = await actionsClient.get({ id: connectorId });
    } catch (err) {
      throw new OnboardingValidationError(`Connector "${connectorId}" was not found`);
    }
    if (connector.actionTypeId !== ONBOARDING_CONNECTOR_TYPE_ID) {
      throw new OnboardingValidationError(
        `Connector "${connector.name}" is not an External Elasticsearch connector`
      );
    }
    const result = await actionsClient.execute({
      actionId: connectorId,
      params: { subAction: 'getClusterInfo', subActionParams: {} },
    });
    if (result.status === 'error') {
      throw new OnboardingValidationError(
        `Could not reach Elasticsearch through "${connector.name}": ${
          result.serviceMessage ?? result.message ?? 'unknown error'
        }`
      );
    }
  };

  return {
    get: async (request) => {
      const execution = await getLatestExecution(request);
      return execution ? { execution: await toExecutionResponse(request, execution) } : {};
    },

    start: async (request, connectorIds) => {
      for (const connectorId of connectorIds) {
        await validateConnector(request, connectorId);
      }
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
        { connector_ids: connectorIds },
        request,
        'nightshift-onboarding'
      );
      logger.info(`Started onboarding suggestions, execution_id=${executionId}`);
      return { execution_id: executionId };
    },

    getConnectorId: async (request) => {
      try {
        const execution = await getLatestExecution(request);
        return execution ? readConnectorIds(execution)[0] : undefined;
      } catch (error) {
        logger.debug(`Could not read the onboarding connector: ${error.message}`);
        return undefined;
      }
    },
  };
};
