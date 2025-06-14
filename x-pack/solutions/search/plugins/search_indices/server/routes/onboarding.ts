/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { getOnboardingToken } from '@kbn/cloud-plugin/server';

import { GET_ONBOARDING_TOKEN_ROUTE } from '../../common/routes';

export function registerOnboardingRoutes(router: IRouter, logger: Logger) {
  router.get(
    {
      path: GET_ONBOARDING_TOKEN_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (context, _request, response) => {
      const core = await context.core;
      const savedObjectsClient = core.savedObjects.getClient({ includedHiddenTypes: ['cloud'] });
      const token = await getOnboardingToken(savedObjectsClient);
      const body = { token };

      return response.ok({
        body,
        headers: { 'content-type': 'application/json' },
      });
    }
  );
}
