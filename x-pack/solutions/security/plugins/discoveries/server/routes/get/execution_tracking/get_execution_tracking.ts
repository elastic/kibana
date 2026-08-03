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
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';
import { WorkflowsManagementApiActions } from '@kbn/workflows';

import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';

import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { getWorkflowExecutionsTracking } from '../pipeline_data/helpers/get_workflow_executions_tracking';

const ROUTE_PATH = '/internal/attack_discovery/executions/{execution_id}/tracking';

const GetExecutionTrackingRequestParams = z.object({
  execution_id: z.string().max(1024),
});

export interface ExecutionTrackingWorkflow {
  workflow_id: string;
  workflow_run_id: string;
}

export interface GetExecutionTrackingResponse {
  alert_retrieval: ExecutionTrackingWorkflow[] | null;
  gate: ExecutionTrackingWorkflow[] | null;
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
          requiredPrivileges: [
            ATTACK_DISCOVERY_API_ACTION_ALL,
            ALERTS_API_READ,
            WorkflowsManagementApiActions.read,
          ],
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

          const { coreStart, pluginsStart } = await getStartServices();
          const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
          const eventLogIndex = await getEventLogIndex();

          // Object-level authorization: reads are bound to the requesting
          // principal so a caller cannot read another user's execution by id
          // within the same space. Without a principal we cannot enforce
          // ownership, so reject.
          const username = coreStart.security.authc.getCurrentUser(request)?.username;
          if (username == null) {
            return response.forbidden({
              body: { message: 'Unable to determine the requesting user' },
            });
          }

          const spaceId = getSpaceId({
            request,
            spaces: pluginsStart.spaces?.spacesService,
          });

          const tracking = await getWorkflowExecutionsTracking({
            esClient,
            eventLogIndex,
            executionId,
            spaceId,
            username,
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
            gate:
              tracking.gate?.map((entry) => ({
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
