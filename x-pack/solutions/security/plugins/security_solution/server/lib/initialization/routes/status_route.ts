/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { INITIALIZATION_STATUS_URL } from '../../../../common/api/initialization';
import type {
  InitializationStatusResponse,
  InitializationFlowId,
} from '../../../../common/api/initialization';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import type { InitializationFlowRegistry } from '../flow_registry';
import { InitializationFlowStateClient } from '../saved_object/initialization_flow_state_client';

export const statusRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  flowRegistry: InitializationFlowRegistry
) => {
  router.versioned
    .get({
      access: 'internal',
      path: INITIALIZATION_STATUS_URL,
      security: {
        authz: {
          enabled: false,
          reason: 'Space initialization status should not require user privileges',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (
        context,
        _request,
        response
      ): Promise<IKibanaResponse<InitializationStatusResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const securitySolution = await context.securitySolution;
          const spaceId = securitySolution.getSpaceId();
          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;

          const stateClient = new InitializationFlowStateClient(soClient, spaceId);
          const registeredFlowIds = flowRegistry.getRegisteredFlowIds();
          const states = await stateClient.getAll(registeredFlowIds);

          const flows: Record<string, { status: string; error?: string }> = {};
          for (const flowId of registeredFlowIds) {
            const state = states[flowId];
            flows[flowId as InitializationFlowId] = {
              status: state.status,
              error: state.error,
            };
          }

          return response.ok({ body: { flows } });
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
