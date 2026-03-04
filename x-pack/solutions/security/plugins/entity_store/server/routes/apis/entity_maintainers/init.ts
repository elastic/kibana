/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { ENTITY_STORE_ROUTES } from '../../../../common';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import { ENTITY_STORE_STATUS } from '../../../domain/constants';
import type { AssetManager } from '../../../domain/asset_manager';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { getMissingPrivileges } from '../utils/get_missing_privileges';

export function registerInitMaintainers(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT,
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
        const { logger, assetManager, entityMaintainersClient } = entityStoreCtx;

        logger.debug('Entity maintainers init API called');

        const validationError = await validateInitMaintainersRequest(assetManager, req, res);
        if (validationError) {
          return validationError;
        }

        await entityMaintainersClient.init(req);

        return res.ok({ body: { ok: true } });
      })
    );
}


/**
 * Validates that the request can proceed with entity maintainers init:
 * 1. User has required privileges (cluster, index, saved object).
 * 2. Entity store is installed (init is only valid when entity store exists).
 * Returns an error response if validation fails, or null if validation passes.
 */
async function validateInitMaintainersRequest(
  assetManager: AssetManager,
  req: KibanaRequest,
  res: KibanaResponseFactory
): Promise<IKibanaResponse | null> {
  const privileges = await assetManager.getPrivileges(req);
  if (!privileges.hasAllRequested) {
    return res.forbidden({
      body: {
        attributes: getMissingPrivileges(privileges),
        message: `User '${privileges.username}' has insufficient privileges`,
      },
    });
  }

  const { status } = await assetManager.getStatus(false);
  if (status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
    return res.badRequest({
      body: {
        message:
          'Entity store is not installed. Install the entity store first, then initialize entity maintainers.',
      },
    });
  }

  return null;
}