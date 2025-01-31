/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { createInventoryServerRoute } from '../create_inventory_server_route';

export const hasDataRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/has_data',
  security: {
    authz: {
      requiredPrivileges: ['inventory'],
    },
  },
  handler: async ({ plugins, request }) => {
    const entityManagerStart = await plugins.entityManager.start();
    const entityManagerClient = await entityManagerStart.getScopedClient({ request });

    const { total } = await entityManagerClient.v2.countEntities({
      start: moment().subtract(15, 'm').toISOString(),
      end: moment().toISOString(),
    });

    return { hasData: total > 0 };
  },
});

export const hasDataRoutes = {
  ...hasDataRoute,
};
