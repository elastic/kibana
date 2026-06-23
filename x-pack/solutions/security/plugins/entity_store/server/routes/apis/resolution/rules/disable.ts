/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../../constants';
import type { EntityStorePluginRouter } from '../../../../types';
import { wrapMiddlewares } from '../../../middleware';
import { enterpriseLicenseMiddleware } from '../../../middleware/enterprise_license';
import { ruleParamsSchema } from './params';

export function registerResolutionRulesDisable(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_DISABLE,
      access: 'public',
      summary: 'Disable a resolution rule',
      description:
        'Disable an out-of-the-box entity resolution rule. Requires an enterprise license.',
      options: {
        tags: ['oas-tag:Security entity store'],
        availability: {
          stability: 'stable',
          since: '9.5.0',
        },
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
          request: {
            params: buildRouteValidationWithZod(ruleParamsSchema),
          },
        },
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../../examples/resolution_rules_disable.yaml'),
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { resolutionRulesClient } = await ctx.entityStore;
          const { id } = req.params;

          await resolutionRulesClient.disable(id);

          return res.ok({ body: { id, enabled: false } });
        },
        [enterpriseLicenseMiddleware]
      )
    );
}
