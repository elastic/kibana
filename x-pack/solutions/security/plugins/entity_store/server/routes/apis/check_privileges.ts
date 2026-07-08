/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'node:path';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { checkEntityStoreIndexPrivileges } from './utils/check_and_format_privileges';

export function registerCheckPrivileges(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.internal.CHECK_PRIVILEGES,
      access: 'internal',
      summary: 'Check Entity Store privileges',
      description:
        'Check whether the current user has the required Elasticsearch and Kibana privileges to use the Entity Store.',
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
        version: API_VERSIONS.internal.v2,
        validate: false,
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/entity_store_check_privileges.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const security = entityStoreCtx.security;
        const spaceId = entityStoreCtx.namespace;

        const response = await checkEntityStoreIndexPrivileges({
          request: req,
          security,
          spaceId,
          includeMetadataPrivileges: true,
        });

        return res.ok({
          body: response,
        });
      })
    );
}
