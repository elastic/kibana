/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  HUNT_FINDINGS_API_PATH,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
} from '../../../common/threat_intelligence/hub';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import { listHuntFindings } from '../services/list_hunt_findings';
import type { RouteRegistrationDeps } from '.';

const huntFindingsQuerySchema = schema.object({
  from: schema.maybe(schema.string()),
  to: schema.maybe(schema.string()),
  min_confidence: schema.maybe(schema.number({ min: 0, max: 1 })),
  size: schema.maybe(schema.number({ min: 1, max: 100 })),
});

/**
 * GET /api/threat_intelligence/hunt_findings — durable hunt findings for Hub.
 */
export const registerHuntFindingsRoute = ({
  router,
  logger,
  getSpacesService,
}: RouteRegistrationDeps): void => {
  router.versioned
    .get({
      path: HUNT_FINDINGS_API_PATH,
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
        validate: { request: { query: huntFindingsQuerySchema } },
      },
      async (context, request, response) => {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);

        try {
          const result = await listHuntFindings(esClient, {
            spaceId,
            from: request.query.from,
            to: request.query.to,
            min_confidence: request.query.min_confidence,
            size: request.query.size,
          });
          return response.ok({ body: result });
        } catch (err) {
          logger.warn(`hunt_findings failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to load hunt findings: ${(err as Error).message}`,
            },
          });
        }
      }
    );
};
