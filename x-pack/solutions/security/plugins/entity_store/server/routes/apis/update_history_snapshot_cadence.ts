/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS, HistorySnapshotCadenceBodyParams } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';

export function registerUpdateHistorySnapshotCadence(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.internal.UPDATE_SNAPHOT_TASK,
      access: 'internal',
      summary: 'Update history snapshot task cadence',
      description:
        'Update the history snapshot schedule. Provide a timezone to switch to a midnight rrule schedule; ' +
        'provide only a frequency to switch to a fixed interval.',
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
            body: buildRouteValidationWithZod(HistorySnapshotCadenceBodyParams),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const { assetManagerClient, logger } = await ctx.entityStore;
        logger.debug('Update history snapshot cadence API called');

        try {
          await assetManagerClient.updateHistorySnapshotCadence(req, req.body);
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return res.notFound({ body: { message: 'Entity store is not installed' } });
          }
          logger.error(error);
          throw error;
        }

        return res.ok({ body: { ok: true } });
      })
    );
}
