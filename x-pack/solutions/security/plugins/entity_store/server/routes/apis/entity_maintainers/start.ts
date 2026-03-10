/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { ENTITY_STORE_ROUTES } from '../../../../common';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { maintainerIdParamsSchema } from './utils/validator';

export function registerStartMaintainer(router: EntityStorePluginRouter) {
  /**
   * Start (or re-start) an entity maintainer task.
   * The task is re-scheduled using the registration configurations (e.g. interval).
   * The task state is set to the maintainer's supplied initial state.
   */
  router.versioned
    .put({
      path: `${ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_START}/{id}`,
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
        const { logger, entityMaintainersClient } = entityStoreCtx;
        const { id } = req.params;

        logger.debug(`Start maintainer API invoked for id: ${id}`);

        await entityMaintainersClient.start(id, req);

        return res.ok({ body: { ok: true } });
      })
    );
}
