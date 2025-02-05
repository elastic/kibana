/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { SETUP_HEALTH_URL } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import type { SetupHealthResponse } from '../../../../../../../common/api/detection_engine';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';

/**
 * Similar to the "setup" command of beats, this endpoint installs resources
 * (dashboards, data views, etc) related to rule monitoring and Detection Engine health,
 * and can do any other setup work.
 */
export const setupHealthRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: SETUP_HEALTH_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      async (context, request, response): Promise<IKibanaResponse<SetupHealthResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['securitySolution']);
          const healthClient = ctx.securitySolution.getDetectionEngineHealthClient();

          await healthClient.installAssetsForMonitoringHealth();

          return response.ok({ body: {} });
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
