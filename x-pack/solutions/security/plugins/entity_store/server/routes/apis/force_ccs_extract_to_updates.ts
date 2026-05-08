/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { EntityType } from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import {
  LOG_EXTRACTION_DELAY_DEFAULT,
  LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT,
} from '../../domain/saved_objects/global_state/constants';

const DEFAULT_DOCS_LIMIT = 10000;

const paramsSchema = z.object({
  entityType: EntityType,
});

const DEFAULT_MAX_LOGS_PER_PAGE = 40000;

const bodySchema = z.object({
  indexPatterns: z.array(z.string()).min(1),
  fromDateISO: z.string().datetime(),
  toDateISO: z.string().datetime(),
  docsLimit: z.number().int().min(1).optional(),
  maxLogsPerPage: z.number().int().min(1).optional(),
});

export function registerForceCcsExtractToUpdates(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.internal.FORCE_CCS_EXTRACT_TO_UPDATES,
      access: 'internal',
      summary: 'Force cross-cluster search extraction',
      description:
        'Trigger an immediate cross-cluster search extraction for the specified entity type, index patterns, and date range.',
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
        const { indexPatterns, fromDateISO, toDateISO, docsLimit, maxLogsPerPage } = req.body;

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
          docsLimit: docsLimit ?? DEFAULT_DOCS_LIMIT,
          maxLogsPerPage: maxLogsPerPage ?? DEFAULT_MAX_LOGS_PER_PAGE,
          lookbackPeriod: LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT,
          delay: LOG_EXTRACTION_DELAY_DEFAULT,
          entityDefinition,
          windowOverride: { fromDateISO, toDateISO },
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
