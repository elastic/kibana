/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger, StartServicesAccessor } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  INITIALIZE_SECURITY_SOLUTION_URL,
  InitializeSecuritySolutionRequestBody,
} from '../../../../common/api/initialization';
import type {
  InitializationFlowId,
  InitializeSecuritySolutionResponse,
  InitializeFlowScheduleResult,
} from '../../../../common/api/initialization';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { StartPlugins } from '../../../plugin_contract';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import type { InitializationFlowRegistry } from '../flow_registry';
import { InitializationFlowStateClient } from '../saved_object/initialization_flow_state_client';
import { scheduleInitializationTask } from '../task/initialization_task';

const getSkipReason = async (
  flowId: InitializationFlowId,
  flowRegistry: InitializationFlowRegistry,
  stateClient: InitializationFlowStateClient,
  force?: boolean
): Promise<string | undefined> => {
  if (!flowRegistry.getFlow(flowId)) {
    return `Flow '${flowId}' is not registered`;
  }

  if (!force) {
    const existing = await stateClient.get(flowId);
    if (existing?.status === 'ready') {
      return 'Already initialized';
    }
    if (existing?.status === 'pending' || existing?.status === 'running') {
      return 'Already in progress';
    }
  }

  return undefined;
};

export const initializeRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  flowRegistry: InitializationFlowRegistry,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: INITIALIZE_SECURITY_SOLUTION_URL,
      security: {
        authz: {
          enabled: false,
          reason: 'Space initialization endpoints should not require user privileges',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(InitializeSecuritySolutionRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<InitializeSecuritySolutionResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const securitySolution = await context.securitySolution;
          const spaceId = securitySolution.getSpaceId();
          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const stateClient = new InitializationFlowStateClient(soClient, spaceId);

          const [, startPlugins] = await getStartServices();
          const { taskManager } = startPlugins;

          if (!taskManager) {
            return siemResponse.error({
              body: 'Task Manager is not available',
              statusCode: 500,
            });
          }

          const { flows, force } = request.body;
          const allFlows = flowRegistry.resolveWithDependencies(flows);
          const results: Record<string, InitializeFlowScheduleResult> = {};

          for (const flowId of allFlows) {
            const skipReason = await getSkipReason(flowId, flowRegistry, stateClient, force);
            if (skipReason) {
              results[flowId] = { scheduled: false, reason: skipReason };
            } else {
              await stateClient.setPending(flowId);
              await scheduleInitializationTask({ taskManager, flowId, spaceId, logger });
              results[flowId] = { scheduled: true };
            }
          }

          return response.ok({ body: { flows: results } });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
