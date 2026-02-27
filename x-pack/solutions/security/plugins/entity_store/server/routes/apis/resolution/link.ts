/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { ENTITY_STORE_ROUTES } from '../../../../common';
import {
  ResolutionLinkRequestBody,
  type ResolutionLinkResponse,
} from '../../../../common/api/resolution/link.gen';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import {
  ChainResolutionError,
  EntitiesNotFoundError,
  EntityHasAliasesError,
  MixedEntityTypesError,
  SelfLinkError,
} from '../../../domain/errors';

export function registerResolutionLink(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.RESOLUTION_LINK,
      access: 'internal',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ResolutionLinkRequestBody),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse<ResolutionLinkResponse>> => {
        const { logger, resolutionClient } = await ctx.entityStore;

        logger.debug('Resolution Link API called');

        try {
          const result = await resolutionClient.linkEntities(
            req.body.target_id,
            req.body.entity_ids
          );

          return res.ok({ body: result });
        } catch (error) {
          if (error instanceof SelfLinkError) {
            return res.badRequest({ body: error });
          }
          if (error instanceof EntitiesNotFoundError) {
            return res.customError({ statusCode: 404, body: error });
          }
          if (
            error instanceof MixedEntityTypesError ||
            error instanceof ChainResolutionError ||
            error instanceof EntityHasAliasesError
          ) {
            return res.customError({ statusCode: 409, body: error });
          }

          logger.error(error);
          throw error;
        }
      })
    );
}
