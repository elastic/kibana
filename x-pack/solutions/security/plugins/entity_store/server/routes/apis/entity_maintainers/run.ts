/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { ENTITY_STORE_ROUTES } from '../../../../common';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { entityMaintainersRegistry } from '../../../tasks/entity_maintainers/entity_maintainers_registry';

const RunMaintainerParamsSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
  })
  .superRefine(validateMaintainerIdExists);

export function registerRunMaintainer(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_RUN,
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
            params: buildRouteValidationWithZod(RunMaintainerParamsSchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, entityMaintainersClient } = entityStoreCtx;
        const { id } = req.params;

        logger.debug(`Run maintainer API invoked for id: ${id}`);

        await entityMaintainersClient.runNow(id, req);

        return res.ok({ body: { ok: true } });
      })
    );
}

function validateMaintainerIdExists(data: { id: string }, ctx: z.RefinementCtx): void {
  if (!entityMaintainersRegistry.hasId(data.id)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['id'],
      message: 'Entity maintainer not found',
    });
  }
}
