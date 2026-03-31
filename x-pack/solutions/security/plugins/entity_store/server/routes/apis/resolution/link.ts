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
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import {
  ChainResolutionError,
  EntitiesNotFoundError,
  EntityHasAliasesError,
  MixedEntityTypesError,
  ResolutionSearchTruncatedError,
  SelfLinkError,
} from '../../../domain/errors';

const bodySchema = z.object({
  target_id: z.string(),
  entity_ids: z.array(z.string()).min(1).max(1000),
});

export function registerResolutionLink(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_LINK,
      access: 'public',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
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
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const { logger, resolutionClient } = await ctx.entityStore;

        logger.debug('Resolution Link API called');

        try {
          const result = await resolutionClient.linkEntities(
            req.body.target_id,
            req.body.entity_ids
          );

          return res.ok({ body: result });
        } catch (error) {
          if (error instanceof EntitiesNotFoundError) {
            return res.customError({ statusCode: 404, body: error });
          }
          if (
            error instanceof SelfLinkError ||
            error instanceof MixedEntityTypesError ||
            error instanceof ChainResolutionError ||
            error instanceof EntityHasAliasesError ||
            error instanceof ResolutionSearchTruncatedError
          ) {
            return res.badRequest({ body: error });
          }

          logger.error(error);
          throw error;
        }
      })
    );
}
