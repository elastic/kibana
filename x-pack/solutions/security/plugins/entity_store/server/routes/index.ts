/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

export function defineRoutes(router: IRouter, logger: Logger) {
  router.versioned
    .get({
      path: '/internal/entity-store',
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason: 'Under development, permissions will be evaluated later',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (ctx, req, res) => {
        return res.ok({
          body: {
            ok: true,
          },
        });
      }
    );
}
