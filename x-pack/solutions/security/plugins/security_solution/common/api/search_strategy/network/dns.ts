/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NetworkQueries } from '../model/factory_query_type';
import { requestOptionsPaginatedSchema } from '../model/request_paginated_options';
import { sort } from '../model/sort';
import { timerange } from '../model/timerange';

export enum NetworkDnsFields {
  dnsName = 'dnsName',
  queryCount = 'queryCount',
  uniqueDomains = 'uniqueDomains',
  dnsBytesIn = 'dnsBytesIn',
  dnsBytesOut = 'dnsBytesOut',
}

export const networkDnsSchema = requestOptionsPaginatedSchema.extend({
  isPtrIncluded: z.boolean().default(false),
  stackByField: z.string().optional(),
  sort,
  timerange,
  factoryQueryType: z.literal(NetworkQueries.dns),
});

export type NetworkDnsRequestOptionsInput = z.input<typeof networkDnsSchema>;

export type NetworkDnsRequestOptions = z.infer<typeof networkDnsSchema>;
