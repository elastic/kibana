/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { enterpriseLicenseMiddleware } from '../../middleware/enterprise_license';
import { EntitiesNotFoundError } from '../../../domain/errors';

const bodySchema = z.object({
  entity_ids: z.array(z.string()).min(1).max(1000),
});

export function registerResolutionUnlink(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_UNLINK,
      access: 'public',
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
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { logger, resolutionClient } = await ctx.entityStore;

          logger.debug('Resolution Unlink API called');

          try {
            const result = await resolutionClient.unlinkEntities(req.body.entity_ids);

            return res.ok({ body: result });
          } catch (error) {
            if (error instanceof EntitiesNotFoundError) {
              return res.customError({ statusCode: 404, body: error });
            }

            logger.error(error);
            throw error;
          }
        },
        [enterpriseLicenseMiddleware]
      )
    );
}
