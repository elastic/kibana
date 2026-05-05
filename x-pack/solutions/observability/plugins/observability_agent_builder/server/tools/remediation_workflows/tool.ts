/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { errorResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { OBSERVABILITY_REMEDIATION_WORKFLOW_TOOL_ID } from './constants';
import { remediationWorkflowToolInputSchema } from './remediation_workflow_schema';
import { getToolHandler } from './handler';
export const createRemediationWorkflowTool = ({
  core,
  logger,
  workflowsManagement,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
  workflowsManagement?: WorkflowsServerPluginSetup;
}): StaticToolRegistration<any> => {
  const toolDefinition: BuiltinToolDefinition<any> = {
    id: OBSERVABILITY_REMEDIATION_WORKFLOW_TOOL_ID,
    type: ToolType.builtin,
    description: `Runs **one** approved observability **emergency remediation workflow** (Buildkite-backed). Pass a natural-language remediation request via \`query\`; an inner agent selects exactly one workflow from the synced catalog, gathers structured parameters (\`service_name\`, \`namespace\`, \`reason\`, etc.), then **interrupts for human confirmation**. After acceptance in the UI, execution resumes and runs the workflow. Use **\`/api/agent_builder/converse\`** with the returned prompt id in \`prompts\` when the conversation awaits confirmation — direct \`tools/_execute\` cannot complete HITL.

Candidate workflows this tool may choose among:
- **Kubernetes rollback (\`remediation_workflow_k8s_rollback\`)** — Bad deployment or rollout regression; reverting the live revision.
- **Circuit breaker / traffic isolation (\`remediation_workflow_circuit_breaker\`)** — Partial pod failure or unstable upstream ejection / optional standby routing.
- **Service scaling (\`remediation_workflow_service_scaling\`)** — Replica and optional limit adjustments for OOM, CPU throttle, or HPA at ceiling.

When NOT to use:
- Before completing attachment validation and required complementary expansion for significant-event remediation skills.

In **standalone** / non-interactive runs, confirmation is unavailable and the tool returns an error instead of executing.`,
    schema: remediationWorkflowToolInputSchema,
    tags: ['observability', 'remediation', 'workflows'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        const base = await getAgentBuilderResourceAvailability({ core, request, logger });
        if (base.status === 'unavailable') {
          return base;
        }
        if (!workflowsManagement) {
          return {
            status: 'unavailable',
            reason:
              'Workflows management is not available in this deployment, so remediation workflows cannot run.',
          };
        }
        return { status: 'available' };
      },
    },
    handler: async (
      toolParams,
      { request, spaceId, runContext, stateManager, prompts, executionMode, modelProvider, events }
    ) => {
      if (!workflowsManagement) {
        return {
          results: [
            errorResult(
              'Workflows management is not available; remediation workflow tools cannot execute.'
            ),
          ],
        };
      }

      try {
        const response = await getToolHandler({
          modelProvider,
          events,
          request,
          spaceId,
          workflowApi: workflowsManagement.management,
          prompts,
          stateManager,
          logger,
          toolParams,
        });
        return response;
      } catch (error) {
        logger.error(`Error executing remediation workflow tool: ${error.message}`);
        logger.debug(error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error executing remediation workflow tool: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
};
