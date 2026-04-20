/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { BodySchema } from './validator';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { getMissingPrivileges } from '../utils/get_missing_privileges';

export function registerInstall(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.public.INSTALL,
      access: 'public',
      summary: 'Install the Entity Store',
      description:
        'Install the Entity Store, creating engines for the specified entity types and configuring log extraction.',
      options: {
        tags: ['oas-tag:Security entity store'],
      },
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
            body: buildRouteValidationWithZod(BodySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/entity_store_install.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const {
          logger,
          assetManagerClient: assetManager,
          entityMaintainersClient,
        } = entityStoreCtx;
        const { entityTypes, logExtraction, historySnapshot } = req.body;
        logger.debug('Install api called');

        const privileges = await assetManager.getPrivileges(
          req,
          logExtraction?.additionalIndexPatterns
        );
        if (!privileges.hasAllRequested) {
          return res.forbidden({
            body: {
              attributes: getMissingPrivileges(privileges),
              message: `User '${privileges.username}' has insufficient privileges`,
            },
          });
        }
        const { engines } = await assetManager.getStatus();
        const installedTypes = new Set(engines.map((e) => e.type));
        const toInstall = entityTypes.filter((type) => !installedTypes.has(type));

        if (!toInstall.length) {
          return res.ok({ body: { ok: true } });
        }

        await assetManager.init(req, toInstall, logExtraction, historySnapshot);
        await entityMaintainersClient.init(req);

        return res.created({ body: { ok: true } });
      })
    );
}
