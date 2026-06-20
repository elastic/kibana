/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { getStepStatus } from '../status/step_status';
import { getWorkflowsStatus } from '../status/workflows_status';
import { getAgentStatus } from '../status/agent_status';
import { getGithubConnectorStatus } from '../status/github_connector_status';
import { getScsReposStatus } from '../status/scs_repos_status';
import { getScsToolsStatus } from '../status/scs_tools_status';
import { getLogSourceStatus } from '../status/log_source_status';

export const registerGetStatusRoute = (
  router: IRouter,
  getServices: () => {
    managedClient: PluginScopedManagedWorkflowsApi;
    workflowsExtensionsStart: WorkflowsExtensionsServerPluginStart;
    agentBuilder?: AgentBuilderPluginStart;
    actions?: ActionsPluginStart;
  }
) => {
  router.get(
    {
      path: '/internal/error_sentry/status',
      validate: false,
      security: {
        authz: { enabled: false, reason: 'Access is controlled by Kibana feature privileges' },
      },
    },
    async (context, request, response) => {
      const { managedClient, workflowsExtensionsStart, agentBuilder, actions } = getServices();

      const esClient = (await context.core).elasticsearch.client.asCurrentUser;

      const [
        stepStatus,
        workflowStatuses,
        agentStatus,
        githubConnectorStatus,
        scsReposStatus,
        scsToolsStatus,
        logSourceStatus,
      ] = await Promise.all([
        Promise.resolve(getStepStatus(workflowsExtensionsStart)),
        getWorkflowsStatus(managedClient),
        getAgentStatus(agentBuilder, request),
        getGithubConnectorStatus(actions, request),
        getScsReposStatus(esClient),
        getScsToolsStatus(agentBuilder, request),
        getLogSourceStatus(esClient),
      ]);

      return response.ok({
        body: {
          components: [
            stepStatus,
            ...workflowStatuses,
            agentStatus,
            githubConnectorStatus,
            scsReposStatus,
            scsToolsStatus,
            logSourceStatus,
          ],
        },
      });
    }
  );
};
