/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const EndpointActionLogRequestSchema = {
  query: schema.object({
    page: schema.number({ defaultValue: 1, min: 1 }),
    page_size: schema.number({ defaultValue: 10, min: 1, max: 100 }),
    start_date: schema.string(),
    end_date: schema.string(),
  }),
  params: schema.object({
    agent_id: schema.string(),
  }),
};

export type EndpointActionLogRequestParams = TypeOf<typeof EndpointActionLogRequestSchema.params>;
export type EndpointActionLogRequestQuery = TypeOf<typeof EndpointActionLogRequestSchema.query>;
