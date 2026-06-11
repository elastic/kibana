/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { enterpriseLicenseMiddleware } from '../../middleware/enterprise_license';
import { OOTB_RESOLUTION_RULES } from '../../../maintainers/automated_resolution/rules_config';

const paramsSchema = z.object({
  id: z.string().describe('Resolution rule identifier'),
});

export function registerResolutionRulesEnable(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_ENABLE,
      access: 'public',
      summary: 'Enable a resolution rule',
      description: 'Enable an OOTB resolution rule by ID. Requires an enterprise license.',
      options: {
        tags: ['oas-tag:Security entity store'],
      },
      security: {
        authz: RESOLUTION_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: { params: buildRouteValidationWithZod(paramsSchema) },
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { logger, resolutionRulesClient } = await ctx.entityStore;
          const { id } = req.params;

          logger.debug(`Resolution rules enable API called for rule: ${id}`);

          const knownRule = OOTB_RESOLUTION_RULES.find((r) => r.id === id);
          if (!knownRule) {
            return res.notFound({ body: { message: `Unknown resolution rule: ${id}` } });
          }

          await resolutionRulesClient.setRuleEnabled(id, true);

          return res.ok({ body: { id, enabled: true } });
        },
        [enterpriseLicenseMiddleware]
      )
    );
}
