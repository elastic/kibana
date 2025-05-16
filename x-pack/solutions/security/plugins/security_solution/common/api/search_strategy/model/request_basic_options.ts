/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { filterQuery } from './filter_query';
import { timerange } from './timerange';

export const requestBasicOptionsSchema = z.object({
  timerange: timerange.optional(),
  filterQuery,
  defaultIndex: z.array(z.string()).optional(),
  id: z.string().optional(),
  params: z.any().optional(),
});

export type RequestBasicOptionsInput = z.input<typeof requestBasicOptionsSchema>;

export type RequestBasicOptions = z.infer<typeof requestBasicOptionsSchema>;
