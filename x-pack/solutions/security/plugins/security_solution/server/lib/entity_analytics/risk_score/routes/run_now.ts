/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { APP_ID } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { RiskScoreMaintainerDeps } from '../maintainer/risk_score_maintainer';
import { runRiskScoreMaintainerOnce } from '../maintainer/risk_score_maintainer';
import type { StartPlugins } from '../../../../plugin';

const RUN_NOW_SOCKET_TIMEOUT_MS = 10 * 60 * 1000;

export const registerRiskScoreRunNowRoute = ({
  router,
  logger,
  maintainerDeps,
}: {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
  maintainerDeps: RiskScoreMaintainerDeps;
}) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/risk_score/run_now',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
      options: {
        timeout: { idleSocket: RUN_NOW_SOCKET_TIMEOUT_MS },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const securityContext = await context.securitySolution;
          const namespace = securityContext.getSpaceId();
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const [, startPlugins] = await maintainerDeps.getStartServices();
          const crudClient = (startPlugins as StartPlugins).entityStore.createCRUDClient(
            esClient,
            namespace
          );
          const abortController = new AbortController();

          await runRiskScoreMaintainerOnce({
            deps: maintainerDeps,
            namespace,
            crudClient,
            abortController,
          });

          return response.ok({ body: { success: true } });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Risk score run_now failed: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
