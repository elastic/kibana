/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import {
  descriptionSchema,
  environmentKeySchema,
  nameSchema,
  paginationSchema,
  timestampsSchema,
  versionSchema,
} from './common';

export const environmentAttributesSchema = lazySchema(() =>
  z.object({
    key: environmentKeySchema,
    name: nameSchema,
    description: descriptionSchema.optional(),
  })
);

export const createEnvironmentRequestSchema = environmentAttributesSchema;

export const updateEnvironmentRequestSchema = lazySchema(() =>
  environmentAttributesSchema.omit({ key: true }).extend({ version: versionSchema.optional() })
);

export const environmentParamsSchema = lazySchema(() =>
  z.object({ environment: environmentKeySchema })
);

export const environmentSchema = lazySchema(() =>
  environmentAttributesSchema.extend(timestampsSchema.shape)
);

export const listEnvironmentsResponseSchema = lazySchema(() =>
  z.object({ items: z.array(environmentSchema) }).extend(paginationSchema.shape)
);

export type EnvironmentAttributes = z.infer<typeof environmentAttributesSchema>;
export type CreateEnvironmentRequest = z.infer<typeof createEnvironmentRequestSchema>;
export type UpdateEnvironmentRequest = z.infer<typeof updateEnvironmentRequestSchema>;
export type Environment = z.infer<typeof environmentSchema>;
export type ListEnvironmentsResponse = z.infer<typeof listEnvironmentsResponseSchema>;
