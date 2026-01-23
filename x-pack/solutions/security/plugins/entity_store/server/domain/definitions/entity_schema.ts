/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

export type EntityType = z.infer<typeof EntityType>;
export const EntityType = z.enum(['user', 'host', 'service', 'generic']);

export const ALL_ENTITY_TYPES = Object.values(EntityType.Values);

const mappingSchema = z.custom<MappingProperty>().optional();

const retentionOperationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('collect_values'), maxLength: z.number() }),
  z.object({ operation: z.literal('prefer_newest_value') }),
  z.object({ operation: z.literal('prefer_oldest_value') }),
]);

const retentionFieldSchema = z.object({
  allowAPIUpdate: z.optional(z.boolean()),
  mapping: mappingSchema,
  source: z.string(),
  destination: z.optional(z.string()),
  retention: retentionOperationSchema,
});

const identityFieldSchema = z.object({
  field: z.string(),
  mapping: mappingSchema,
});

export const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  filter: z.string().optional(),
  fields: z.array(retentionFieldSchema),
  identityFields: z.array(identityFieldSchema),
  indexPatterns: z.array(z.string()),
});

export type EntityRetentionField = z.infer<typeof retentionFieldSchema>; // entity field for retention operations
export type EntityDefinition = z.infer<typeof entitySchema>; // entity with id generated in runtime
export type EntityDefinitionWithoutId = Omit<EntityDefinition, 'id'>;
export type ManagedEntityDefinition = EntityDefinition & { type: EntityType }; // entity with a known 'type'
