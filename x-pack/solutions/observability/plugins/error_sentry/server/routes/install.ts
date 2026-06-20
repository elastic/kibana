/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { ALL_WORKFLOW_IDS } from '../install/install_workflows';
import { installAllWorkflows, installWorkflow } from '../install/install_workflows';
import { installDetectiveRalph } from '../install/install_agent';
import {
  ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
  ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID,
  ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID,
  ERROR_SENTRY_INTROSPECT_WORKFLOW_ID,
  ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
} from '../../common/constants';

export const registerInstallRoutes = (
  router: IRouter,
  getServices: () => {
    managedClient: PluginScopedManagedWorkflowsApi;
    agentBuilder: AgentBuilderPluginStart | undefined;
  }
) => {
  router.post(
    {
      path: '/internal/error_sentry/install',
      validate: false,
      security: {
        authz: { enabled: false, reason: 'Access is controlled by Kibana feature privileges' },
      },
    },
    async (_context, request, response) => {
      const { managedClient, agentBuilder } = getServices();

      await installAllWorkflows(managedClient);

      if (agentBuilder) {
        const registry = await agentBuilder.agents.getRegistry({ request });
        await installDetectiveRalph(registry);
      }

      return response.ok({ body: { installed: true } });
    }
  );

  router.post(
    {
      path: '/internal/error_sentry/install/{componentId}',
      validate: {
        params: schema.object({
          componentId: schema.string(),
        }),
      },
      security: {
        authz: { enabled: false, reason: 'Access is controlled by Kibana feature privileges' },
      },
    },
    async (_context, request, response) => {
      const { componentId } = request.params;
      const { managedClient, agentBuilder } = getServices();

      if (componentId === 'agent_ralph') {
        if (!agentBuilder) {
          return response.badRequest({ body: { message: 'Agent Builder is not available.' } });
        }
        const registry = await agentBuilder.agents.getRegistry({ request });
        await installDetectiveRalph(registry);
        return response.ok({ body: { installed: true, componentId } });
      }

      const workflowComponentMap: Record<string, (typeof ALL_WORKFLOW_IDS)[number]> = {
        workflow_capture: ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
        workflow_escalate_github: ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID,
        workflow_ask_ralph: ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID,
        workflow_introspect: ERROR_SENTRY_INTROSPECT_WORKFLOW_ID,
        workflow_ralph_investigation: ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
      };

      const workflowId = workflowComponentMap[componentId];
      if (!workflowId) {
        return response.badRequest({
          body: { message: `Component ${componentId} is not repairable via this endpoint.` },
        });
      }

      await installWorkflow(managedClient, workflowId);
      return response.ok({ body: { installed: true, componentId } });
    }
  );
};
