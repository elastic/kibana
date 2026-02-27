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
  ResolutionGroupRequestQuery,
  type ResolutionGroupResponse,
} from '../../../../common/api/resolution/group.gen';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { EntitiesNotFoundError } from '../../../domain/errors';

export function registerResolutionGroup(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.RESOLUTION_GROUP,
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
            query: buildRouteValidationWithZod(ResolutionGroupRequestQuery),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse<ResolutionGroupResponse>> => {
        const { logger, resolutionClient } = await ctx.entityStore;

        logger.debug('Resolution Group API called');

        try {
          const result = await resolutionClient.getResolutionGroup(req.query.entity_id);

          return res.ok({ body: result });
        } catch (error) {
          if (error instanceof EntitiesNotFoundError) {
            return res.customError({ statusCode: 404, body: error });
          }

          logger.error(error);
          throw error;
        }
      })
    );
}
