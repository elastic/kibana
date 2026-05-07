/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool as toTool } from '@langchain/core/tools';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import dedent from 'dedent';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { getRemediationWorkflowTarget } from './constants';
import {
  standardCoordinationRemediationToolSchema,
  type RemediationWorkflowToolParams,
} from './remediation_workflow_schema';
import { resolveWorkflowIdByExactName } from './resolve_workflow_id';
import { executeRemediationWorkflow } from './remediation_workflow_tools';

const DESCRIPTION = dedent(`
  Standard remediation coordination and audit closure.
`);

export const createRemediationWorkflowTools = ({
  request,
  spaceId,
  workflowApi,
  logger,
}: {
  request: KibanaRequest;
  spaceId: string;
  workflowApi: WorkflowsServerPluginSetup['management'];
  logger: Logger;
}) => {
  const target = getRemediationWorkflowTarget();
  const description = dedent(`
      ${DESCRIPTION}

      Registered workflow: **${target.exactWorkflowName}** (${target.displayLabel}).
    `);

  const tool = toTool(
    async (args: Record<string, unknown>) => {
      const parsed = standardCoordinationRemediationToolSchema.safeParse(args);

      if (!parsed.success) {
        return JSON.stringify({
          error: `Invalid remediation arguments: ${parsed.error.message}`,
        });
      }

      const toolParams = parsed.data as RemediationWorkflowToolParams;

      try {
        const workflowId = await resolveWorkflowIdByExactName({
          workflowApi,
          spaceId,
          exactWorkflowName: target.exactWorkflowName,
          searchQuery: target.searchQuery,
        });

        if (!workflowId) {
          return JSON.stringify({
            error: `Remediation workflow "${target.exactWorkflowName}" was not found in this space. Ensure workflows are synced.`,
            statusCode: 404,
          });
        }

        const execution = await executeRemediationWorkflow({
          toolParams,
          workflowId,
          request,
          spaceId,
          workflowApi,
          waitForCompletion: true,
        });

        return JSON.stringify({
          response: {
            workflow_type: 'standard_coordination',
            workflow_id: workflowId,
            exact_workflow_name: target.exactWorkflowName,
            params: toolParams,
            execution,
          },
        });
      } catch (error) {
        logger.error(error);
        return JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : 'Unexpected error while executing remediation workflow',
        });
      }
    },
    {
      name: 'remediation_workflow_standard_coordination',
      description,
      schema: standardCoordinationRemediationToolSchema,
    }
  );
  return [tool];
};
