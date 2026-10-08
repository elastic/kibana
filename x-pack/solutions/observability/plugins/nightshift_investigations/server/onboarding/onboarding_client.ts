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
  isOnboardingConnectorTypeId,
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
  /**
   * The connectors of the space's latest onboarding execution the caller can read. The first
   * Elastic deployment among them is the space's telemetry connector.
   */
  getConnectors: (request: KibanaRequest) => Promise<OnboardingConnectorSummary[]>;
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

const readUsedCustomContext = (execution: Pick<WorkflowExecutionDto, 'context'>): boolean => {
  const inputs = (execution.context?.inputs ?? {}) as { custom_context?: unknown };
  return typeof inputs.custom_context === 'string' && inputs.custom_context.trim().length > 0;
};

/** Creates the client for the per-space Nightshift onboarding state. */
export const createOnboardingClient = ({
  getDeps,
  getCustomContextInstructions,
  logger,
}: {
  getDeps: () => OnboardingClientDeps;
  /** The space's custom context, formatted for a prompt; the exploration run uses it as hints. */
  getCustomContextInstructions: (request: KibanaRequest, spaceId: string) => Promise<string>;
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
        connector_type_id: connector.actionTypeId,
        url: readString(connector.config?.url),
        kibana_url: readString(connector.config?.kibanaUrl),
      };
    } catch {
      // Deleted or no longer readable: the UI offers to connect again.
      return undefined;
    }
  };

  const summarizeConnectors = async (
    request: KibanaRequest,
    connectorIds: string[]
  ): Promise<OnboardingConnectorSummary[]> =>
    (await Promise.all(connectorIds.map((id) => summarizeConnector(request, id)))).filter(
      (connector): connector is OnboardingConnectorSummary => Boolean(connector)
    );

  const toExecutionResponse = async (
    request: KibanaRequest,
    execution: WorkflowExecutionDto
  ): Promise<OnboardingSuggestionsExecution> => {
    const connectors = await summarizeConnectors(request, readConnectorIds(execution));
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
      used_custom_context: readUsedCustomContext(execution),
    };
  };

  const validateConnector = async (
    request: KibanaRequest,
    connectorId: string
  ): Promise<string> => {
    const actionsClient = await getActionsClient(request);
    let connector: Awaited<ReturnType<typeof actionsClient.get>>;
    try {
      connector = await actionsClient.get({ id: connectorId });
    } catch (err) {
      throw new OnboardingValidationError(`Connector "${connectorId}" was not found`);
    }
    if (!isOnboardingConnectorTypeId(connector.actionTypeId)) {
      throw new OnboardingValidationError(
        `Connector "${connector.name}" (${connector.actionTypeId}) cannot be used for onboarding`
      );
    }
    if (connector.actionTypeId !== ONBOARDING_CONNECTOR_TYPE_ID) {
      return connector.actionTypeId;
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
    return connector.actionTypeId;
  };

  return {
    get: async (request) => {
      const execution = await getLatestExecution(request);
      return execution ? { execution: await toExecutionResponse(request, execution) } : {};
    },

    start: async (request, connectorIds) => {
      const types = await Promise.all(
        connectorIds.map((connectorId) => validateConnector(request, connectorId))
      );
      if (!types.includes(ONBOARDING_CONNECTOR_TYPE_ID)) {
        throw new OnboardingValidationError('Connect at least one Elastic deployment');
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
      const customContext = await getCustomContextInstructions(request, spaceId).catch((error) => {
        // Hints only sharpen the suggestions; exploring without them still works.
        logger.warn(`Could not read the custom context for onboarding: ${error.message}`);
        return '';
      });
      const executionId = await management.runWorkflow(
        { ...workflow, definition: workflow.definition },
        spaceId,
        {
          connector_ids: connectorIds,
          ...(customContext ? { custom_context: customContext } : {}),
        },
        request,
        'nightshift-onboarding'
      );
      logger.info(`Started onboarding suggestions, execution_id=${executionId}`);
      return { execution_id: executionId };
    },

    getConnectors: async (request) => {
      try {
        const execution = await getLatestExecution(request);
        return execution ? await summarizeConnectors(request, readConnectorIds(execution)) : [];
      } catch (error) {
        logger.debug(`Could not read the onboarding connectors: ${error.message}`);
        return [];
      }
    },
  };
};
