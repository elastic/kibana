/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetTypesResponse } from '../types';
import { createEntityInventoryServerRoute } from '../create_server_route';
import { INTERIM_AUTHZ } from '../interim_authz';

export const typesRoute = createEntityInventoryServerRoute({
  endpoint: 'GET /internal/entity_inventory/types',
  options: {
    access: 'internal',
    summary: 'Get entity inventory types',
    description:
      'Returns one entry per registered entity definition that has a dynamic block, with its identity fields, columns and sources.',
  },
  security: INTERIM_AUTHZ,
  handler: async ({ request, getInventoryService }): Promise<GetTypesResponse> => {
    const inventoryService = await getInventoryService(request);
    return inventoryService.listTypes();
  },
});
