/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { PlanResponse } from '../../../common';
import { createEntityInventoryServerRoute } from '../create_server_route';
import { INTERIM_AUTHZ } from '../interim_authz';
import { planRequestBodySchema } from '../utils/request_params';
import { typeNameSchema } from '../utils/type_name_schema';
import { createAbortSignal } from '../utils/create_abort_signal';

export const planRoute = createEntityInventoryServerRoute({
  endpoint: 'POST /internal/entity_inventory/entities/{type}/_plan',
  params: lazySchema(() =>
    z.object({
      path: z.object({ type: typeNameSchema }),
      body: planRequestBodySchema,
    })
  ),
  options: {
    access: 'internal',
    summary: 'Plan the list queries of a type',
    description:
      'Runs the probes of the type and returns them with the list queries the _list route would send for the same request, as Elasticsearch _query request bodies, without running the list queries.',
  },
  security: INTERIM_AUTHZ,
  handler: async ({ request, params, getInventoryService }): Promise<PlanResponse> => {
    const { path, body } = params;
    const inventoryService = await getInventoryService(request);
    return inventoryService.plan({
      type: path.type,
      window: { from: body.from, to: body.to },
      limit: body.limit,
      signal: createAbortSignal(request.events.aborted$),
    });
  },
});
