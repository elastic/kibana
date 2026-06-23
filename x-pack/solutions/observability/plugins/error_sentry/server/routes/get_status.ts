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
import type { CaptureConfig } from '../../common/constants';
import { CAPTURE_CONFIG_DOC_ID, CAPTURE_CONFIG_INDEX } from '../../common/constants';
import { getStepStatuses } from '../status/step_status';
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

      const captureConfigResult = await esClient
        .get<CaptureConfig>({ index: CAPTURE_CONFIG_INDEX, id: CAPTURE_CONFIG_DOC_ID })
        .then((r) => (r.found ? r._source : undefined))
        .catch(() => undefined);

      const [
        stepStatuses,
        workflowStatuses,
        agentStatus,
        githubConnectorStatus,
        scsReposStatus,
        scsToolsStatus,
        logSourceStatus,
      ] = await Promise.all([
        Promise.resolve(getStepStatuses(workflowsExtensionsStart)),
        getWorkflowsStatus(managedClient),
        getAgentStatus(agentBuilder, request),
        getGithubConnectorStatus(actions, request),
        getScsReposStatus(esClient),
        getScsToolsStatus(agentBuilder, request),
        getLogSourceStatus(esClient, captureConfigResult),
      ]);

      return response.ok({
        body: {
          components: [
            ...stepStatuses,
            ...workflowStatuses,
            agentStatus,
            githubConnectorStatus,
            scsReposStatus,
            scsToolsStatus,
            logSourceStatus,
          ],
          captureConfig: captureConfigResult ?? null,
        },
      });
    }
  );
};
