/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import {
  appKeySchema,
  descriptionSchema,
  nameSchema,
  paginationSchema,
  timestampsSchema,
  versionSchema,
} from './common';

export const appAttributesSchema = lazySchema(() =>
  z.object({
    key: appKeySchema,
    name: nameSchema,
    description: descriptionSchema.optional(),
  })
);

export const createAppRequestSchema = appAttributesSchema;

export const updateAppRequestSchema = lazySchema(() =>
  appAttributesSchema.omit({ key: true }).extend({ version: versionSchema.optional() })
);

export const appParamsSchema = lazySchema(() => z.object({ app: appKeySchema }));

export const appSchema = lazySchema(() => appAttributesSchema.extend(timestampsSchema.shape));

export const listAppsResponseSchema = lazySchema(() =>
  z.object({ items: z.array(appSchema) }).extend(paginationSchema.shape)
);

export type AppAttributes = z.infer<typeof appAttributesSchema>;
export type CreateAppRequest = z.infer<typeof createAppRequestSchema>;
export type UpdateAppRequest = z.infer<typeof updateAppRequestSchema>;
export type App = z.infer<typeof appSchema>;
export type ListAppsResponse = z.infer<typeof listAppsResponseSchema>;
