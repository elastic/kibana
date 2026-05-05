/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { tool as toTool } from '@langchain/core/tools';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import dedent from 'dedent';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  getRemediationWorkflowTarget,
  type RemediationWorkflowType,
  REMEDIATION_WORKFLOW_TYPES,
} from './constants';
import {
  circuitBreakerRemediationToolSchema,
  k8sRollbackRemediationToolSchema,
  serviceScalingRemediationToolSchema,
  type RemediationWorkflowToolParams,
} from './remediation_workflow_schema';
import { resolveWorkflowIdByExactName } from './resolve_workflow_id';
import { executeRemediationWorkflow } from './remediation_workflow_tools';

const DESCRIPTIONS: Record<RemediationWorkflowType, string> = {
  k8s_rollback: dedent(`
    Emergency **Kubernetes rollback** for a bad deployment or rollout regression.
    When to use: Live revision is the likely cause; revert is the mitigation.
  `),
  circuit_breaker: dedent(`
    **Traffic isolation** (circuit breaking, optional standby) for unstable upstreams or partial pod failure.
    When to use: Eject unhealthy hosts or route to standby; not for pure resource exhaustion.
  `),
  service_scaling: dedent(`
    **Emergency scaling** and optional container limit changes (OOM, CPU throttle, HPA maxed).
    When to use: Resource exhaustion; prefer rollback first if the release itself is bad.
  `),
};

const SCHEMA_BY_TYPE: Record<RemediationWorkflowType, z.ZodTypeAny> = {
  k8s_rollback: k8sRollbackRemediationToolSchema,
  circuit_breaker: circuitBreakerRemediationToolSchema,
  service_scaling: serviceScalingRemediationToolSchema,
};

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
  return REMEDIATION_WORKFLOW_TYPES.map((workflowType) => {
    const target = getRemediationWorkflowTarget(workflowType);
    const description = dedent(`
      ${DESCRIPTIONS[workflowType]}

      Registered workflow: **${target.exactWorkflowName}** (${target.displayLabel}).
    `);

    return toTool(
      async (args: Record<string, unknown>) => {
        const parsed = SCHEMA_BY_TYPE[workflowType].safeParse(args);

        if (!parsed.success) {
          return JSON.stringify({
            error: `Invalid remediation arguments (${workflowType}): ${parsed.error.message}`,
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
              workflow_type: workflowType,
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
        name: `remediation_workflow_${workflowType}`,
        description,
        schema: SCHEMA_BY_TYPE[workflowType],
      }
    );
  });
};
