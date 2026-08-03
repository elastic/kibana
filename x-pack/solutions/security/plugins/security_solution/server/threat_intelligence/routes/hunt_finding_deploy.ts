/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  HUNT_FINDING_DEPLOY_API_PATH,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
} from '../../../common/threat_intelligence/hub';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import {
  HuntFindingNotFoundError,
  markHuntFindingDeployed,
} from '../services/mark_hunt_finding_deployed';
import type { RouteRegistrationDeps } from '.';

const deployPathParamsSchema = schema.object({
  findingId: schema.string({ minLength: 1 }),
});

const deployBodySchema = schema.object({
  rule_id: schema.string({ minLength: 1 }),
});

/**
 * POST /api/threat_intelligence/hunt_findings/{findingId}/deploy
 * Marks a hunt finding as deployed after a Detection Engine rule was created.
 */
export const registerHuntFindingDeployRoute = ({
  router,
  logger,
  getSpacesService,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: HUNT_FINDING_DEPLOY_API_PATH,
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
        validate: {
          request: {
            params: deployPathParamsSchema,
            body: deployBodySchema,
          },
        },
      },
      async (context, request, response) => {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);

        try {
          const result = await markHuntFindingDeployed(esClient, {
            spaceId,
            findingId: request.params.findingId,
            ruleId: request.body.rule_id,
          });
          return response.ok({ body: result });
        } catch (err) {
          if (err instanceof HuntFindingNotFoundError) {
            return response.notFound({
              body: { message: err.message },
            });
          }
          logger.warn(`hunt_finding_deploy failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to mark hunt finding deployed: ${(err as Error).message}`,
            },
          });
        }
      }
    );
};
