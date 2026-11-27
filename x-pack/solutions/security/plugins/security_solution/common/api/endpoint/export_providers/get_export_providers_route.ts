/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const ExportProvidersRequestSchema = {
  query: schema.object({
    /** The Fleet agent id of the host (same bound as the response action `endpoint_ids` items) */
    agentId: schema.string({ minLength: 1, maxLength: 256 }),
  }),
};

export type ExportProvidersRequestQueryParams = TypeOf<typeof ExportProvidersRequestSchema.query>;
