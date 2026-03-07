/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionSchema as streamlangConditionSchema } from '@kbn/streamlang';
import { z } from '@kbn/zod/v4';

export type EntityType = z.infer<typeof EntityType>;
export const EntityType = z.enum(['user', 'host', 'service', 'generic']);

export const ALL_ENTITY_TYPES = Object.values(EntityType.enum);

const mappingSchema = z.any();

const retentionOperationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('collect_values'), maxLength: z.number() }),
  z.object({ operation: z.literal('prefer_newest_value') }),
  z.object({ operation: z.literal('prefer_oldest_value') }),
]);

const fieldSchema = z.object({
  allowAPIUpdate: z.optional(z.boolean()),
  mapping: z.optional(mappingSchema),
  source: z.string(),
  destination: z.string(),
  retention: retentionOperationSchema,
});

const euidFieldSchema = z.object({
  field: z.string(),
});

const euidSeparatorSchema = z.object({
  separator: z.string(),
});

/** Minimal conditional for an euid instruction: doc must have field === eq (after field evaluations). */
const euidConditionalSchema = z.object({
  field: z.string(),
  eq: z.string(),
});

const euidFieldInstructionSchema = z.object({
  conditional: euidConditionalSchema.optional(),
  composition: z.array(z.union([euidFieldSchema, euidSeparatorSchema])),
});

// Field evaluation: pre-evaluate a field before euid generation (first match wins; fallback to source value).
// Source fields are required in the main query filter so only documents with source set reach evaluation.
const fieldEvaluationWhenClauseSchema = z.object({
  sourceMatchesAny: z.array(z.string()),
  then: z.string(),
});

const fieldEvaluationSchema = z.object({
  destination: z.string(),
  source: z.string(),
  whenClauses: z.array(fieldEvaluationWhenClauseSchema),
});

// Any field used in the euid calculation must be mapped in the fields array,
// otherwise we won't have guarantees of field being available
const calculatedIdentityFieldLogicSchema = z.object({
  // Sequential order of fields to be used to generate the identity field.
  // The ids that are generated using the esqlEvaluation will also be prepended
  // with the type (e.g. `host:`). The fields found on the default id won't be prepended.
  // ALL THE FIELDS MUST BE OF MAPPING TYPE 'keyword'
  euidFields: z.array(euidFieldInstructionSchema),

  // Optional pre-evaluated fields (e.g. entity.namespace from event.module). Applied before
  // euid generation and translated to ESQL, Painless, and in-memory.
  fieldEvaluations: z.optional(z.array(fieldEvaluationSchema)),

  // Document-level filter (Condition from @kbn/streamlang). Only documents matching this
  // filter are considered for this entity type. Must express "at least one identity field
  // present" (and any entity-specific rules, e.g. user IDP pre-conditions). Translated to
  // DSL and ESQL via conditionToQueryDsl and conditionToESQL.
  documentsFilter: streamlangConditionSchema,

  // When true, the entity id is not prefixed with the entity type (e.g. output "a" instead of "generic:a").
  skipTypePrepend: z.optional(z.boolean()),
});

/**
 * Single-field identity: entity is identified by one field only (e.g. service.name, entity.id).
 * No composition, no field evaluations. ESQL/DSL use a simplified path for this shape.
 */
export const singleFieldIdentitySchema = z.object({
  singleField: z.string(),
  // When true, the entity id is not prefixed with the entity type (e.g. output "a" instead of "generic:a").
  skipTypePrepend: z.optional(z.boolean()),
});

const identityFieldSchema = z.union([
  calculatedIdentityFieldLogicSchema,
  singleFieldIdentitySchema,
]);

export const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: EntityType,
  filter: z.string().optional(),
  entityTypeFallback: z.string().optional(),
  fields: z.array(fieldSchema),
  identityField: identityFieldSchema,
  indexPatterns: z.array(z.string()),
});

export type EntityField = z.infer<typeof fieldSchema>; // entities fields
export type CalculatedEntityIdentity = z.infer<typeof calculatedIdentityFieldLogicSchema>; // full identity (euidFields + documentsFilter + optional fieldEvaluations)
export type SingleFieldIdentity = z.infer<typeof singleFieldIdentitySchema>;
export type EntityIdentity = z.infer<typeof identityFieldSchema>; // definition-time identity (full or singleField)
export type EntityDefinition = z.infer<typeof entitySchema>; // entity with id generated in runtime
export type EntityDefinitionWithoutId = Omit<EntityDefinition, 'id'>;
export type ManagedEntityDefinition = EntityDefinition & { type: EntityType }; // entity with a known 'type'
export type EuidField = z.infer<typeof euidFieldSchema>;
export type EuidSeparator = z.infer<typeof euidSeparatorSchema>;
export type EuidAttribute = EuidField | EuidSeparator;
export type EuidConditional = z.infer<typeof euidConditionalSchema>;
export type EuidFieldInstruction = z.infer<typeof euidFieldInstructionSchema>;
export type FieldEvaluationWhenClause = z.infer<typeof fieldEvaluationWhenClauseSchema>;
export type FieldEvaluation = z.infer<typeof fieldEvaluationSchema>;

export function isSingleFieldIdentity(identity: EntityIdentity): identity is SingleFieldIdentity {
  return (
    'singleField' in identity && typeof (identity as SingleFieldIdentity).singleField === 'string'
  );
}
