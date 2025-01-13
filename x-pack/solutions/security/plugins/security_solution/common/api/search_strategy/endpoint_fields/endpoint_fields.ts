/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const endpointFieldsRequestSchema = z.object({
  indices: z.array(z.string()),
  onlyCheckIfIndicesExist: z.boolean(),
});

export type EndpointFieldsRequestSchemaInput = z.input<typeof endpointFieldsRequestSchema>;

export type EndpointFieldsRequestSchema = z.infer<typeof endpointFieldsRequestSchema>;
