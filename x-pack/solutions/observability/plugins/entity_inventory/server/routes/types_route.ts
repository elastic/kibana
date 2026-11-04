/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntityInventoryServerRoute } from './create_server_route';

export const typesRoute = createEntityInventoryServerRoute({
  endpoint: 'GET /internal/entity_inventory/types',
  options: {
    access: 'internal',
    summary: 'Get entity inventory types',
    description:
      'Returns one entry per registered entity definition that has a dynamic block, with its identity fields, columns and sources.',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'Interim: this route is internal, reads only code-registered definitions, and the plugin is off by default. The privilege model is tracked in elastic/observability-dev#6244.',
    },
  },
  handler: async ({ request, getInventoryService }) => {
    const inventoryService = await getInventoryService(request);
    return inventoryService.getTypes();
  },
});
