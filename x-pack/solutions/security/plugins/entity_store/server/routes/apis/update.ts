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
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { EntityType } from '../../../common/domain/definitions/entity_schema';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import {
  LogExtractionFrequencySchema,
  LogExtractionUpdadeSchema,
} from './utils/log_extraction_validator';
import { ENTITY_STORE_STATUS } from '../../domain/constants';
import { EngineNotActionableError, EnginesNotInstalledError } from '../../domain/errors';

const bodySchema = z.union([
  // extended API - allows setting frequency for specfic entity types
  z.object({
    entityTypes: z.array(EntityType).min(1),
    logExtraction: LogExtractionFrequencySchema,
  }),
  // original API - 1) global SO update for all properties. and 2) SO engine descriptor update with frequency only
  z.object({ logExtraction: LogExtractionUpdadeSchema }).strict(),
]);

type UpdateBody = z.infer<typeof bodySchema>;
type GlobalLogExtractionConfig = Omit<z.infer<typeof LogExtractionUpdadeSchema>, 'frequency'>;
interface NormalizedUpdate {
  frequency: string | undefined;
  entityTypes: EntityType[];
  globalConfig: GlobalLogExtractionConfig | null;
}

// Collapse the two body variants into a uniform shape. Global variant substitutes
// `installedTypes` for the missing `entityTypes`; extended variant passes them through and
// `setExtractFrequency` validates them at the domain layer.
const normalizeUpdate = (body: UpdateBody, installedTypes: EntityType[]): NormalizedUpdate => {
  if ('entityTypes' in body) {
    return {
      frequency: body.logExtraction.frequency,
      entityTypes: body.entityTypes,
      globalConfig: null,
    };
  }
  const { frequency, ...globalConfig } = body.logExtraction;
  return {
    frequency,
    entityTypes: installedTypes,
    globalConfig: Object.keys(globalConfig).length ? globalConfig : null,
  };
};

export function registerUpdate(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.UPDATE,
      access: 'public',
      summary: 'Update the Entity Store',
      description:
        'Update the Entity Store log extraction configuration. ' +
        'Provide `entityTypes` together with `logExtraction.frequency` to change the extraction frequency for the listed engines only. ' +
        'Omit `entityTypes` to update global fields (e.g. `delay`, `lookbackPeriod`) and/or set `frequency` for every installed engine.',
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
        const {
          logsExtractionClient,
          assetManagerClient: assetManager,
          logger,
        } = await ctx.entityStore;
        logger.debug('Update api called');

        const { status, engines } = await assetManager.getStatus();
        if (status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
          return res.notFound({ body: { message: 'Entity store is not installed' } });
        }

        const installedTypes = engines.map((e) => e.type);
        const { frequency, entityTypes, globalConfig } = normalizeUpdate(req.body, installedTypes);

        try {
          if (frequency !== undefined) {
            await assetManager.setExtractFrequency(req, frequency, entityTypes);
          }
          if (globalConfig) {
            await logsExtractionClient.updateConfig(globalConfig);
          }
        } catch (error) {
          if (error instanceof EngineNotActionableError) {
            logger.warn(`Update rejected with conflict: ${error.message}`);
            return res.conflict({ body: { message: error.message } });
          }
          if (error instanceof EnginesNotInstalledError) {
            logger.warn(`Update rejected — missing engines: ${error.message}`);
            return res.badRequest({ body: { message: error.message } });
          }
          throw error;
        }

        return res.ok({ body: { ok: true } });
      })
    );
}
