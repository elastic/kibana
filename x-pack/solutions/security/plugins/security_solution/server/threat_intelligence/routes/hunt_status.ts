/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HUNT_STATUS_API_PATH,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
} from '../../../common/threat_intelligence/hub';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import { getHuntStatus } from '../services/hunt_status';
import type { RouteRegistrationDeps } from '.';

/**
 * GET /api/threat_intelligence/hunt_status — continuous-hunt run status
 * for the Intelligence Hub status strip. Read-only; joins workflows
 * execution history with hunt-findings / report-feedback stats. The
 * workflows internal indices are read with the internal user (they are
 * system indices), gated behind the same read privilege as
 * `hunt_findings`, and only run metadata is returned.
 */
export const registerHuntStatusRoute = ({
  router,
  logger,
  getSpacesService,
}: RouteRegistrationDeps): void => {
  router.versioned
    .get({
      path: HUNT_STATUS_API_PATH,
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
        validate: false,
      },
      async (context, request, response) => {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const internalClient = core.elasticsearch.client.asInternalUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);

        try {
          const result = await getHuntStatus(esClient, internalClient, logger, { spaceId });
          return response.ok({ body: result });
        } catch (err) {
          logger.warn(`hunt_status failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to load hunt status: ${(err as Error).message}`,
            },
          });
        }
      }
    );
};
