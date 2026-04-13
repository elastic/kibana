/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { maintainerIdParamsSchema, validateMaintainersRequest } from './utils/validator';

export function registerStopMaintainer(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: `${ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_STOP}`,
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
            params: buildRouteValidationWithZod(maintainerIdParamsSchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManagerClient, entityMaintainersClient } = entityStoreCtx;
        const { id } = req.params;

        logger.debug(`Stop maintainer API invoked for id: ${id}`);

        const validationError = await validateMaintainersRequest(assetManagerClient, req, res);
        if (validationError) {
          return validationError;
        }

        await entityMaintainersClient.stop(id, req);

        return res.ok({ body: { ok: true } });
      })
    );
}
