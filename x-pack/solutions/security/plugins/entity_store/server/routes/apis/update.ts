/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS, KnowledgeIndicatorsUpdateParams } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { LogExtractionUpdadeSchema } from './utils/log_extraction_validator';

const bodySchema = z
  .object({
    /**
     * Optional partial update to the log-extraction config. Omitting the
     * field leaves the persisted config untouched; supplying it merges
     * the provided keys onto the persisted block (read-modify-write is
     * performed by `LogsExtractionClient.updateConfig`).
     */
    logExtraction: LogExtractionUpdadeSchema.optional(),
    /**
     * Optional partial update to the Knowledge Indicators config. Omitting
     * the field leaves the persisted config untouched; supplying it merges
     * the provided keys onto the persisted block (read-modify-write is
     * performed by `EntityStoreGlobalStateClient.updateKnowledgeIndicatorsConfig`).
     */
    knowledgeIndicators: KnowledgeIndicatorsUpdateParams.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.logExtraction === undefined && data.knowledgeIndicators === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'must supply at least one of `logExtraction` or `knowledgeIndicators`',
      });
    }
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
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/entity_store_update.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const { logsExtractionClient, globalStateClient, logger } = await ctx.entityStore;
        logger.debug('Update api called');

        try {
          // Each block is independent of the other and is only written when
          // the caller actually supplies it. Keeping the writes separate
          // means a callsite that only wants to retune one of the two pays
          // no cost on the other (no read, no write, no schema parse). The
          // body schema's `superRefine` already rejects requests that omit
          // both, so we never reach this point with nothing to do.
          if (req.body.logExtraction !== undefined) {
            await logsExtractionClient.updateConfig(req.body.logExtraction);
          }
          if (req.body.knowledgeIndicators !== undefined) {
            await globalStateClient.updateKnowledgeIndicatorsConfig(req.body.knowledgeIndicators);
          }
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return res.notFound({ body: { message: 'Entity store is not installed' } });
          }
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
