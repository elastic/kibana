/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { ListResponse } from '../types';
import { createEntityInventoryServerRoute } from '../create_server_route';
import { INTERIM_AUTHZ } from '../interim_authz';
import { instantParam, listLimitParam } from '../utils/request_params';
import { typeNameSchema } from '../utils/type_name_schema';
import { withTimeRangeGuardrail } from '../utils/time_range_guardrail';
import { createAbortSignal } from '../utils/create_abort_signal';

export const listRoute = createEntityInventoryServerRoute({
  endpoint: 'POST /internal/entity_inventory/entities/{type}/_list',
  params: lazySchema(() =>
    z.object({
      path: z.object({ type: typeNameSchema }),
      body: z
        .object({
          from: instantParam,
          to: instantParam,
          limit: listLimitParam,
        })
        .strict()
        .refine(({ from, to }) => Date.parse(from) < Date.parse(to), {
          message: 'from must be earlier than to',
        }),
    })
  ),
  options: {
    access: 'internal',
    summary: 'List entities of a type',
    description:
      'Returns one row per entity of the type seen in the window, merged across its sources, newest last_seen first.',
  },
  security: INTERIM_AUTHZ,
  handler: withTimeRangeGuardrail(
    async ({ request, params, getInventoryService }): Promise<ListResponse> => {
      const { path, body } = params;
      const inventoryService = await getInventoryService(request);
      return inventoryService.list({
        type: path.type,
        window: { from: body.from, to: body.to },
        limit: body.limit,
        signal: createAbortSignal(request.events.aborted$),
      });
    }
  ),
});
