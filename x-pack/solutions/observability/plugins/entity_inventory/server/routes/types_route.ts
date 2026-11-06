/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_INVENTORY_API_PRIVILEGES } from '../../common/privileges';
import type { GetTypesResponse } from '../inventory/types';
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
      requiredPrivileges: [ENTITY_INVENTORY_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getInventoryService }): Promise<GetTypesResponse> => {
    const inventoryService = await getInventoryService(request);
    return inventoryService.listTypes();
  },
});
