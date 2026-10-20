/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger, StartServicesAccessor } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  INFERENCE_CONNECTOR_CLUSTER_PRIVILEGE,
  INFERENCE_CONNECTOR_PRIVILEGES_INTERNAL_URL,
} from '../../../common/inference_connector/constants';
import { API_VERSIONS } from '../../../common/constants';
import type { StartPlugins } from '../../plugin';
import type { SecuritySolutionPluginRouter } from '../../types';

export const registerInferenceConnectorRoutes = ({
  router,
  getStartServices,
  logger,
}: {
  router: SecuritySolutionPluginRouter;
  getStartServices: StartServicesAccessor<StartPlugins>;
  logger: Logger;
}) => {
  router.versioned
    .get({
      access: 'internal',
      path: INFERENCE_CONNECTOR_PRIVILEGES_INTERNAL_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<{ has_all_required: boolean }>> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const [_, { security }] = await getStartServices();
          const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
          const { hasAllRequested } = await checkPrivileges({
            elasticsearch: {
              cluster: [INFERENCE_CONNECTOR_CLUSTER_PRIVILEGE],
              index: {},
            },
          });

          return response.ok({
            body: {
              has_all_required: hasAllRequested,
            },
          });
        } catch (e) {
          logger.error(`Error checking Inference connector privileges: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
