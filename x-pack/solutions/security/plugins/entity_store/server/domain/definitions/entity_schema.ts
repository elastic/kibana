/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { EntityType } from './registry';

const retentionOperationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('collect_values'), maxLength: z.number() }),
  z.object({ operation: z.literal('prefer_newest_value') }),
  z.object({ operation: z.literal('prefer_oldest_value') }),
]);

const fieldSchema = z
  .object({
    allowAPIUpdate: z.optional(z.boolean()),
    mapping: z.any(),
    source: z.string(),
    destination: z.optional(z.string()),
    retention: retentionOperationSchema,
  })
  .refine((v) => ({
    ...v,
    destination: v.destination ?? v.source,
  }));

const identityFieldSchema = z.object({
  field: z.string(),
  mapping: z.any(), // !!
});

export const baseEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  filter: z.string().optional(),
  fields: z.array(fieldSchema),
  identityFields: z.array(identityFieldSchema),
  indexPatterns: z.array(z.string()),
});

export const managedEntitySchema = baseEntitySchema.extend({ type: EntityType });

export type EntityDefinition = z.infer<typeof baseEntitySchema>; // any entity definition
export type EntityDescription = Omit<EntityDefinition, 'id'>; // entity definition without id
export type ManagedEntity = z.infer<typeof managedEntitySchema>; // entity definition with id and a known type
export type FieldDescription = z.infer<typeof fieldSchema>;
