/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type EntityType = z.infer<typeof EntityType>;
export const EntityType = z.enum(['user', 'host', 'service', 'generic']);

export const ALL_ENTITY_TYPES = Object.values(EntityType.Values);

const mappingSchema = z.any();

const retentionOperationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('collect_values'), maxLength: z.number() }),
  z.object({ operation: z.literal('prefer_newest_value') }),
  z.object({ operation: z.literal('prefer_oldest_value') }),
]);

const fieldSchema = z.object({
  allowAPIUpdate: z.optional(z.boolean()),
  mapping: mappingSchema,
  source: z.string(),
  destination: z.string(),
  retention: retentionOperationSchema,
});

const calculatedIdentityFieldLogic = z.object({
  // The field that will be used as the default id field.
  defaultIdField: z.string(),
  defaultIdFieldMapping: mappingSchema,

  // Filter to be applied before evaluating the evaluation logic
  requiresOneOfFields: z.array(z.string()),

  // Evaluation logic to be used to generate the identity field.
  // Here, the default id (e.g. `host.entity.id`) should not be mentioned,
  // because this is part of the main query building logic.
  // The ids that were generated using the esqlEvaluation will also be prepended
  // with the type (e.g. `host:`). The fields found on the default id won't be prepended.
  esqlEvaluation: z.string(),

  calculated: z.literal(true),
});

const identityFieldSchema = z.object({
  field: z.string(),
  mapping: mappingSchema,
  calculated: z.literal(false).optional(),
});

export const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: EntityType,
  filter: z.string().optional(),
  entityTypeFallback: z.string().optional(),
  fields: z.array(fieldSchema),
  identityField: z.union([identityFieldSchema, calculatedIdentityFieldLogic]),
  indexPatterns: z.array(z.string()),
});

export type EntityField = z.infer<typeof fieldSchema>; // entities fields
export type EntityCalculatedIdentityLogic = z.infer<typeof calculatedIdentityFieldLogic>; // logic to generate identity field
export type EntityIdentityField = z.infer<typeof identityFieldSchema>; // field to use as identity field
export type EntityIdentity = EntityIdentityField | EntityCalculatedIdentityLogic; // instructions to use or generate identity field
export type EntityDefinition = z.infer<typeof entitySchema>; // entity with id generated in runtime
export type EntityDefinitionWithoutId = Omit<EntityDefinition, 'id'>;
export type ManagedEntityDefinition = EntityDefinition & { type: EntityType }; // entity with a known 'type'
