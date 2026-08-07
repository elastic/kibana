/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { EntityStorePreferences } from '../../domain/saved_objects';

export function registerGetPreferences(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.internal.PREFERENCES,
      access: 'internal',
      summary: 'Get Entity Store preferences',
      description: 'Read the Entity Store preferences for the current space.',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {},
      },
      wrapMiddlewares(async (ctx, _req, res): Promise<IKibanaResponse> => {
        const { preferencesClient } = await ctx.entityStore;
        const preferences = await preferencesClient.get();
        return res.ok({ body: preferences });
      })
    );
}

export function registerUpdatePreferences(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.internal.PREFERENCES,
      access: 'internal',
      summary: 'Update Entity Store preferences',
      description: 'Update the Entity Store preferences for the current space.',
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
            body: buildStrictRouteValidationWithZod(EntityStorePreferences),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const { preferencesClient } = await ctx.entityStore;
        await preferencesClient.update(req.body);
        return res.ok({ body: { ok: true } });
      })
    );
}
