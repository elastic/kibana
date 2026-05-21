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
import { EntitiesNotFoundError } from '../../../domain/errors';

const bodySchema = z.object({
  entity_ids: z
    .array(z.string())
    .min(1)
    .max(1000)
    .describe('Entity identifiers to unlink from their resolution group. Minimum 1, maximum 1000.'),
});

export function registerResolutionUnlink(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_UNLINK,
      access: 'public',
      summary: 'Unlink entities',
      description:
        'Remove one or more entities from their resolution group. Changes become ' +
        'visible on subsequent reads after the next index refresh (typically <1s). ' +
        'Requires an enterprise license.',
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
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/resolution_unlink.yaml'),
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
