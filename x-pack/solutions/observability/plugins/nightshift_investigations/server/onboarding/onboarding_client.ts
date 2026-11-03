/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type {
  EnableOnboardingResponse,
  GetOnboardingResponse,
  OnboardingSuggestionsExecution,
  OnboardingSuggestionsStatus,
  StartOnboardingSuggestionsResponse,
} from '../../common/onboarding';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import { OnboardingUnavailableError } from './errors';
import {
  ensureLocalElasticsearchConnector,
  resolveLocalElasticsearchUrl,
} from './local_elasticsearch_connector';
import { parseSuggestions } from './parse_suggestions';

export { OnboardingUnavailableError };

export interface OnboardingClientDeps {
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  agentAvailability?: AgentAvailabilityConfig;
  actions?: ActionsPluginStart;
  elasticsearch?: ElasticsearchServiceStart;
  cloud?: CloudSetup;
  esHosts?: string[];
}

/**
 * Per-space onboarding state. The first step, enabling Nightshift, is the investigation agent
 * being installed in the space. The rest lives in the executions of the onboarding suggestions
 * workflow: the latest execution's output holds the suggested first investigations.
 */
export interface OnboardingClient {
  get: (request: KibanaRequest) => Promise<GetOnboardingResponse>;
  /** Enables Nightshift in the space: installs the investigation agent there. */
  enable: (request: KibanaRequest) => Promise<EnableOnboardingResponse>;
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

  const isAgentInstalled = async (request: KibanaRequest): Promise<boolean> => {
    const { agentBuilder } = getDeps();
    if (!agentBuilder) return false;
    try {
      const registry = await agentBuilder.agents.getRegistry({ request });
      return await registry.has(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
    } catch (error) {
      // Onboarding must still render; the step then asks to enable again.
      logger.warn(`Could not check the investigation agent: ${(error as Error).message}`);
      return false;
    }
  };

  return {
    get: async (request) => {
      const agentInstalled = await isAgentInstalled(request);
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
      if (!latest) return { agent_installed: agentInstalled };
      const execution = await management.getWorkflowExecution(latest.id, spaceId, {
        includeOutput: true,
        omitStepExecutions: true,
        request,
      });
      return {
        agent_installed: agentInstalled,
        ...(execution ? { execution: toExecutionResponse(execution) } : {}),
      };
    },

    enable: async (request) => {
      const { agentBuilder, agentAvailability, actions, elasticsearch, cloud, esHosts } = getDeps();
      if (!agentBuilder || !agentAvailability) {
        throw new OnboardingUnavailableError('Agent Builder is not available');
      }

      const spaceId = getSpaceId(request);

      let connectorId: string | undefined;
      try {
        if (!actions || !elasticsearch) {
          throw new OnboardingUnavailableError('Connectors are not available');
        }
        const url = resolveLocalElasticsearchUrl({ cloud, elasticsearch, esHosts });
        connectorId = await ensureLocalElasticsearchConnector({
          esClient: elasticsearch.client.asScoped(request).asCurrentUser,
          actionsClient: await actions.getActionsClientWithRequest(request),
          spaceId,
          url,
          logger,
        });
      } catch (error) {
        logger.error(
          `Could not prepare a local Elasticsearch connector for the investigation agent in ` +
            `space "${spaceId}": ${(error as Error).message}`
        );
      }

      await installInvestigationAgent({
        agentBuilder,
        spaceId,
        availability: agentAvailability,
        connectorIds: connectorId ? [connectorId] : [],
      });
      logger.info(
        `Enabled Nightshift in space "${spaceId}": investigation agent installed` +
          (connectorId ? ` with local Elasticsearch connector "${connectorId}"` : '')
      );
      return { agent_installed: true };
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
