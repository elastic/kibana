/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { filterQuery } from '../model/filter_query';
import { runtimeMappings } from '../model/runtime_mappings';
import { timerange } from '../model/timerange';

export const timelineRequestBasicOptionsSchema = z.object({
  indexType: z.string().optional(),
  id: z.string().optional(),
  timerange: timerange.optional(),
  filterQuery,
  defaultIndex: z.array(z.string()).optional(),
  entityType: z.enum(['events', 'sessions']).optional(),
  runtimeMappings,
  params: z.any().optional(),
  filterStatus: z
    .union([z.literal('open'), z.literal('closed'), z.literal('acknowledged')])
    .optional(),
});
