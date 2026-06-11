/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { enterpriseLicenseMiddleware } from '../../middleware/enterprise_license';
import { OOTB_RESOLUTION_RULES } from '../../../maintainers/automated_resolution/rules_config';

export function registerResolutionRulesList(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_LIST,
      access: 'public',
      summary: 'List resolution rules',
      description:
        'List all configured entity resolution rules and their enabled/disabled state. Requires an enterprise license.',
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
        validate: false,
      },
      wrapMiddlewares(
        async (ctx, _req, res): Promise<IKibanaResponse> => {
          const { logger, resolutionRulesClient } = await ctx.entityStore;

          logger.debug('Resolution rules list API called');

          const overrides = await resolutionRulesClient.getOverrides().catch((err: Error) => {
            logger.warn(`Failed to read rule overrides: ${err.message}`);
            return {} as Record<string, boolean>;
          });

          const rules = OOTB_RESOLUTION_RULES.map((rule) => ({
            id: rule.id,
            description: rule.description,
            enabled: overrides[rule.id] !== false,
          }));

          return res.ok({ body: { rules } });
        },
        [enterpriseLicenseMiddleware]
      )
    );
}
