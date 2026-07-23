/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTINUOUS_HUNT_STATUS_API_PATH,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
} from '../../../common/threat_intelligence/hub';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import { getContinuousHuntStatus } from '../services/continuous_hunt_status';
import type { RouteRegistrationDeps } from '.';

/**
 * GET /api/threat_intelligence/continuous_hunt/status
 *
 * Aggregates continuous hunt workflow execution (default space) with
 * space-scoped hunt findings for the Intelligence Hub status strip.
 */
export const registerContinuousHuntStatusRoute = ({
  router,
  logger,
  getSpacesService,
  getTaskManager,
  getWorkflowsManagement,
}: RouteRegistrationDeps): void => {
  router.versioned
    .get({
      path: CONTINUOUS_HUNT_STATUS_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.read],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {},
      },
      async (context, request, response) => {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);

        try {
          const body = await getContinuousHuntStatus({
            spaceId,
            esClient,
            logger,
            workflowsManagement: getWorkflowsManagement?.(),
            taskManager: getTaskManager?.(),
          });
          return response.ok({ body });
        } catch (err) {
          logger.warn(`continuous_hunt/status failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to load continuous hunt status: ${(err as Error).message}`,
            },
          });
        }
      }
    );
};
