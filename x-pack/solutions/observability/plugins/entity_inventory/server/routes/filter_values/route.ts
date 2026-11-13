/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AttributeValuesResponse } from '../types';
import { createEntityInventoryServerRoute } from '../create_server_route';
import { INTERIM_AUTHZ } from '../interim_authz';
import {
  dateRangeRefinement,
  instantParam,
  isFromEarlierThanTo,
  listLimitParam,
} from '../utils/request_params';
import { typeNameSchema } from '../utils/type_name_schema';
import { createAbortSignal } from '../utils/create_abort_signal';

// Bounds on the size of a request, not design limits.
const MAX_TYPES = 32;
const MAX_FILTERS = 16;
const MAX_VALUES = 100;
const MAX_TEXT_LENGTH = 256;

const textParam = lazySchema(() => z.string().min(1).max(MAX_TEXT_LENGTH));

export const filterValuesRoute = createEntityInventoryServerRoute({
  endpoint: 'POST /internal/entity_inventory/filters/_values',
  params: lazySchema(() =>
    z.object({
      body: z
        .object({
          attribute: textParam,
          types: z.array(typeNameSchema).min(1).max(MAX_TYPES),
          filters: z
            .record(textParam, z.array(textParam).max(MAX_VALUES))
            .refine((filters) => Object.keys(filters).length <= MAX_FILTERS, {
              message: `at most ${MAX_FILTERS} filters are allowed`,
            })
            .default({}),
          selected: z.array(textParam).max(MAX_VALUES).default([]),
          from: instantParam,
          to: instantParam,
          limit: listLimitParam,
        })
        .strict()
        .refine(isFromEarlierThanTo, dateRangeRefinement),
    })
  ),
  options: {
    access: 'internal',
    summary: 'List the values of a filter',
    description:
      'Returns the distinct values a dropdown can offer for an attribute that the types in scope suggest as a filter, narrowed by the other filters, with the selected values that are no longer offered.',
  },
  security: INTERIM_AUTHZ,
  handler: async ({ request, params, getInventoryService }): Promise<AttributeValuesResponse> => {
    const { body } = params;
    const inventoryService = await getInventoryService(request);
    return inventoryService.listAttributeValues({
      attribute: body.attribute,
      types: body.types,
      selections: body.filters,
      selected: body.selected,
      window: { from: body.from, to: body.to },
      limit: body.limit,
      signal: createAbortSignal(request.events.aborted$),
    });
  },
});
