/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { EntityType } from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';

const DEFAULT_DOCS_LIMIT = 10000;

const paramsSchema = z.object({
  entityType: EntityType,
});

const bodySchema = z.object({
  indexPatterns: z.array(z.string()).min(1),
  fromDateISO: z.string().datetime(),
  toDateISO: z.string().datetime(),
  docsLimit: z.number().int().positive().optional(),
});

export function registerForceCcsExtractToUpdates(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: '/internal/security/entity_store/{entityType}/force_ccs_extract_to_updates',
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
            params: buildRouteValidationWithZod(paramsSchema),
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger: baseLogger, ccsLogsExtractionClient, namespace } = entityStoreCtx;
        const { entityType } = req.params;
        const { indexPatterns, fromDateISO, toDateISO, docsLimit } = req.body;

        const logger = baseLogger.get('forceCcsExtractToUpdates').get(entityType);
        logger.debug(
          `Force CCS extract to updates API called for entity type: ${entityType}, index patterns: ${indexPatterns.join(
            ', '
          )}`
        );

        const entityDefinition = getEntityDefinition(entityType, namespace);
        const result = await ccsLogsExtractionClient.extractToUpdates({
          type: entityType,
          remoteIndexPatterns: indexPatterns,
          fromDateISO,
          toDateISO,
          docsLimit: docsLimit ?? DEFAULT_DOCS_LIMIT,
          entityDefinition,
        });

        if (result.error) {
          return res.customError({
            statusCode: 500,
            body: {
              message: result.error.message,
            },
          });
        }

        return res.ok({
          body: { count: result.count, pages: result.pages },
        });
      })
    );
}
