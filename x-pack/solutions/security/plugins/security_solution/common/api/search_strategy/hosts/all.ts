/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { HostsQueries } from '../model/factory_query_type';
import { pagination } from '../model/pagination';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { timerange } from '../model/timerange';
import { sort } from './model/sort';

export const allHostsSchema = requestBasicOptionsSchema.extend({
  sort,
  pagination,
  timerange,
  factoryQueryType: z.literal(HostsQueries.hosts),
});

export type HostsRequestOptionsInput = z.input<typeof allHostsSchema>;

export type HostsRequestOptions = z.infer<typeof allHostsSchema>;
