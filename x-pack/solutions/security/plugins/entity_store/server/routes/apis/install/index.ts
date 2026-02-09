/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { BodySchema } from './validator';

export function registerInstall(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: '/internal/security/entity-store/install',
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
            body: buildRouteValidationWithZod(BodySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManager } = entityStoreCtx;
        const { entityTypes, logExtraction } = req.body;
        logger.debug('Install api called');

        const { engines } = await assetManager.getStatus();
        const installedTypes = new Set(engines.map((e) => e.type));
        const toInstall = entityTypes.filter((type) => !installedTypes.has(type));

        if (!toInstall.length) {
          return res.ok({ body: { ok: true } });
        }

        await Promise.all(
          toInstall.map((type) => assetManager.initEntity(req, type, logExtraction))
        );

        return res.created({ body: { ok: true } });
      })
    );
}
