/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse } from '@kbn/core-http-server';
import { ENTITY_STORE_ROUTES } from '../../../common';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { getLatestEntitiesIndexName } from '../../domain/asset_manager/latest_index';
import { checkAndFormatPrivileges } from './utils/check_and_format_privileges';

export function registerCheckPrivileges(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.CHECK_PRIVILEGES,
      access: 'internal',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: false,
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const security = entityStoreCtx.security;
        const spaceId = entityStoreCtx.namespace;
        const entitiesIndexPattern = getLatestEntitiesIndexName(spaceId);

        const response = await checkAndFormatPrivileges({
          indexPattern: entitiesIndexPattern,
          request: req,
          security,
          privilegesToCheck: {
            elasticsearch: {
              cluster: [],
              index: {
                [entitiesIndexPattern]: ['read', 'write'],
              },
            },
          },
        });

        return res.ok({
          body: response,
        });
      })
    );
}
