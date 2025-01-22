/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { RelatedEntitiesQueries } from '../model/factory_query_type';
import { inspect } from '../model/inspect';
import { requestBasicOptionsSchema } from '../model/request_basic_options';

export const relatedUsersRequestOptionsSchema = requestBasicOptionsSchema.extend({
  hostName: z.string(),
  skip: z.boolean().optional(),
  from: z.string(),
  inspect,
  factoryQueryType: z.literal(RelatedEntitiesQueries.relatedUsers),
});

export type RelatedUsersRequestOptionsInput = z.input<typeof relatedUsersRequestOptionsSchema>;

export type RelatedUsersRequestOptions = z.infer<typeof relatedUsersRequestOptionsSchema>;
