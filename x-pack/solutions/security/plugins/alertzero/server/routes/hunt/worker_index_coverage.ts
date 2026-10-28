/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntWorkerIndexCoverageResponse } from '@kbn/alertzero-common';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
  getWorkerRoleName,
} from '@kbn/alertzero-common';
import {
  ALERTZERO_API_PRIVILEGE_READ,
  HUNT_WORKER_INDEX_COVERAGE_URL,
} from '../../../common/constants';
import { resolveWorkerIndexCoverage } from '../../services/watches/hunt/common/resolve_worker_index_coverage';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';
import type { RouteDependencies } from '../register_routes';
import { resolveHuntUniverse } from './resolve_hunt_universe';

/**
 * Which patterns of the space's default data view the Hunt worker's service account cannot read
 * but the caller can. `index_scope` answers as the caller, so it cannot show the worker's view.
 */
export const registerHuntWorkerIndexCoverageRoute = ({
  router,
  logger,
  getSpaceId,
  getWorkersService,
  getWorkflowsManagement,
  isServerless,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: HUNT_WORKER_INDEX_COVERAGE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Hunt worker index coverage',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const indexPatterns = await resolveHuntUniverse(context, logger);
          const { workflowId, serviceAccountId } = await getWorkersService().getHuntCoverageInputs(
            spaceId,
            request
          );
          const body: HuntWorkerIndexCoverageResponse = await resolveWorkerIndexCoverage({
            esClient,
            management: getWorkflowsManagement(),
            request,
            spaceId,
            indexPatterns,
            workflowId,
            serviceAccountId,
            roleName: getWorkerRoleName(
              WORKER_SERVICE_ACCOUNT_NAMES[SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID],
              { isServerless }
            ),
            isServerless,
            logger,
          });
          return response.ok({ body });
        } catch (err) {
          logger.error(`Failed to resolve hunt worker index coverage: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to resolve hunt worker index coverage' },
          });
        }
      })
    );
};
