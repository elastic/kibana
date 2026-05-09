/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { enterpriseLicenseMiddleware } from '../../middleware/enterprise_license';
import { EntitiesNotFoundError, ResolutionSearchTruncatedError } from '../../../domain/errors';

const querySchema = z.object({
  entity_id: z.string().describe('The entity identifier to look up the resolution group for.'),
});

export function registerResolutionGroup(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_GROUP,
      access: 'public',
      summary: 'Get resolution group',
      description:
        'Get the resolution group for a given entity, returning all linked entities. Requires an enterprise license.',
      options: {
        tags: ['oas-tag:Security entity store'],
      },
      security: {
        authz: RESOLUTION_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(querySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/resolution_group.yaml'),
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { logger, resolutionClient } = await ctx.entityStore;

          logger.debug('Resolution Group API called');

          try {
            const result = await resolutionClient.getResolutionGroup(req.query.entity_id);

            return res.ok({ body: result });
          } catch (error) {
            if (error instanceof EntitiesNotFoundError) {
              return res.customError({ statusCode: 404, body: error });
            }
            if (error instanceof ResolutionSearchTruncatedError) {
              return res.badRequest({ body: error });
            }

            logger.error(error);
            throw error;
          }
        },
        [enterpriseLicenseMiddleware]
      )
    );
}
