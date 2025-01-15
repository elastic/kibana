/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerAppSearchGatedFormRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/app_search/as_gate',
      validate: {
        body: schema.object({
          as_gate_data: schema.object({
            additional_feedback: schema.maybe(schema.string()),
            feature: schema.string(),
            features_other: schema.maybe(schema.string()),
            participate_in_ux_labs: schema.maybe(schema.boolean()),
          }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v2/internal/as_gate',
    })
  );
}
