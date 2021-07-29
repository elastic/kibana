/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup } from '../../../../../../../src/core/server';

export function initRoutes(core: CoreSetup) {
  const authenticationAppOptions = { simulateUnauthorized: false };
  core.http.resources.register(
    {
      path: '/authentication/app',
      validate: false,
    },
    async (context, request, response) => {
      if (authenticationAppOptions.simulateUnauthorized) {
        return response.unauthorized();
      }
      return response.renderCoreApp();
    }
  );

  const router = core.http.createRouter();
  router.post(
    {
      path: '/authentication/app/setup',
      validate: { body: schema.object({ simulateUnauthorized: schema.boolean() }) },
      options: { authRequired: false, xsrfRequired: false },
    },
    (context, request, response) => {
      authenticationAppOptions.simulateUnauthorized = request.body.simulateUnauthorized;
      return response.ok();
    }
  );
}
