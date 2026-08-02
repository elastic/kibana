/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { ENTITY_STORE_STATUS } from '../../domain/constants';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { LogExtractionUpdadeSchema } from './utils/log_extraction_validator';
import { enforceEntityStorePrivileges } from './utils/check_entity_store_privileges';

const bodySchema = z.object({
  logExtraction: LogExtractionUpdadeSchema,
});

export function registerUpdate(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.UPDATE,
      access: 'public',
      summary: 'Update the Entity Store',
      description: 'Update the Entity Store log extraction configuration.',
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
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/entity_store_update.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const {
          logsExtractionClient,
          assetManagerClient: assetManager,
          logger,
        } = await ctx.entityStore;
        logger.debug('Update api called');

        const forbidden = await enforceEntityStorePrivileges(
          assetManager,
          req,
          res,
          req.body.logExtraction?.additionalIndexPatterns
        );
        if (forbidden) return forbidden;

        const { status } = await assetManager.getStatus();
        if (status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
          return res.notFound({ body: { message: 'Entity store is not installed' } });
        }

        try {
          await logsExtractionClient.updateConfig(req.body.logExtraction);
        } catch (error) {
          logger.error(error);
          throw error;
        }

        return res.ok({
          body: {
            ok: true,
          },
        });
      })
    );
}
