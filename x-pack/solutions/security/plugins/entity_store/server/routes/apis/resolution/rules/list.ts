/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../../constants';
import type { EntityStorePluginRouter } from '../../../../types';
import { wrapMiddlewares } from '../../../middleware';
import { enterpriseLicenseMiddleware } from '../../../middleware/enterprise_license';
import { RESOLUTION_RULE_CONFIGS } from '../../../../maintainers/automated_resolution/rule_config';

export function registerResolutionRulesList(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_LIST,
      access: 'public',
      summary: 'List resolution rules',
      description:
        'List the out-of-the-box entity resolution rules and their enabled state. ' +
        'Requires an enterprise license.',
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
        validate: {},
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../../examples/resolution_rules_list.yaml'),
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { resolutionRuleOverridesClient } = await ctx.entityStore;

          const overrides = await resolutionRuleOverridesClient.find();
          const rules = RESOLUTION_RULE_CONFIGS.map((rule) => ({
            id: rule.id,
            description: rule.description,
            enabled: overrides?.overrides[rule.id]?.enabled !== false,
            // Built-in rules are defined in code, so always managed. The field exists to
            // distinguish them from customer-authored rules (managed: false) in future.
            managed: true,
          }));

          return res.ok({ body: { rules } });
        },
        [enterpriseLicenseMiddleware]
      )
    );
}
