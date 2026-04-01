/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CoreStart, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';

import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { getWorkflowExecutionsTracking } from '../pipeline_data/helpers/get_workflow_executions_tracking';

const ROUTE_PATH = '/internal/attack_discovery/executions/{execution_id}/tracking';

const GetExecutionTrackingRequestParams = z.object({
  execution_id: z.string(),
});

export interface ExecutionTrackingWorkflow {
  workflow_id: string;
  workflow_run_id: string;
}

export interface GetExecutionTrackingResponse {
  alert_retrieval: ExecutionTrackingWorkflow[] | null;
  generation: ExecutionTrackingWorkflow | null;
  validation: ExecutionTrackingWorkflow | null;
}

export const registerGetExecutionTrackingRoute = (
  router: IRouter,
  logger: Logger,
  {
    getEventLogIndex,
    getStartServices,
  }: {
    getEventLogIndex: () => Promise<string>;
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
  }
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: GetExecutionTrackingRequestParams,
          },
        },
      },
      async (context, request, response) => {
        const disabledResponse = await assertWorkflowsEnabled({ context, response });
        if (disabledResponse) {
          return disabledResponse;
        }

        try {
          const { execution_id: executionId } = request.params;

          const { coreStart } = await getStartServices();
          const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
          const eventLogIndex = await getEventLogIndex();

          const tracking = await getWorkflowExecutionsTracking({
            esClient,
            eventLogIndex,
            executionId,
          });

          if (tracking == null) {
            return response.notFound({
              body: { message: `Execution ${executionId} not found in event log` },
            });
          }

          const responseBody: GetExecutionTrackingResponse = {
            alert_retrieval:
              tracking.alertRetrieval?.map((entry) => ({
                workflow_id: entry.workflowId,
                workflow_run_id: entry.workflowRunId,
              })) ?? null,
            generation:
              tracking.generation != null
                ? {
                    workflow_id: tracking.generation.workflowId,
                    workflow_run_id: tracking.generation.workflowRunId,
                  }
                : null,
            validation:
              tracking.validation != null
                ? {
                    workflow_id: tracking.validation.workflowId,
                    workflow_run_id: tracking.validation.workflowRunId,
                  }
                : null,
          };

          return response.ok({ body: responseBody });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Error fetching execution tracking: ${errorMessage}`);
          const error = transformError(err);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
