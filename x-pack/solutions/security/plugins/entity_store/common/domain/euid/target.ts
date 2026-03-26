/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import type {
  EntityDefinitionWithoutId,
  EntityType,
  EuidAttribute,
  EuidRankingBranch,
} from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { getEuidEsqlEvaluationFromDefinition } from './esql';
import { isEuidField } from './commons';

/**
 * Inserts `.target` after the first path segment (entity type namespace).
 * e.g. `user.email` → `user.target.email`, `host.id` → `host.target.id`,
 * `entity.id` → `entity.target.id`, `user.domain` → `user.target.domain`
 */
function toTargetField(field: string): string {
  const parts = field.split('.');
  if (parts.length < 2) return field;
  return `${parts[0]}.target.${parts.slice(1).join('.')}`;
}

function transformCondition(condition: Condition): Condition {
  if ('and' in condition) {
    return { and: condition.and.map(transformCondition) };
  }
  if ('or' in condition) {
    return { or: condition.or.map(transformCondition) };
  }
  if ('not' in condition) {
    return { not: transformCondition(condition.not) };
  }
  if ('always' in condition || 'never' in condition) {
    return condition;
  }
  return { ...condition, field: toTargetField(condition.field) };
}

function transformEuidAttribute(attr: EuidAttribute): EuidAttribute {
  if (isEuidField(attr)) {
    return { field: toTargetField(attr.field) };
  }
  return attr;
}

/**
 * Creates a target-namespace variant of an entity definition.
 * Transforms field references from actor namespace (e.g., `user.email`)
 * to target namespace (e.g., `user.target.email`).
 *
 * The entity type and EUID type prefix remain unchanged.
 */
function createTargetEntityDefinition(
  baseDefinition: EntityDefinitionWithoutId
): EntityDefinitionWithoutId {
  const { identityField } = baseDefinition;

  if (isSingleFieldIdentity(identityField)) {
    return {
      ...baseDefinition,
      identityField: {
        ...identityField,
        singleField: toTargetField(identityField.singleField),
      },
    };
  }

  // Collect field evaluation destination fields (e.g., entity.namespace).
  // These are computed intermediate values reused from the actor pipeline,
  // so they must NOT be transformed to the target namespace.
  const evaluationDestinations = new Set(
    identityField.fieldEvaluations?.map((e) => e.destination) ?? []
  );

  const transformAttr = (attr: EuidAttribute): EuidAttribute => {
    if (isEuidField(attr) && evaluationDestinations.has(attr.field)) {
      return attr; // keep computed fields as-is (e.g., entity.namespace)
    }
    return transformEuidAttribute(attr);
  };

  const transformBranch = (branch: EuidRankingBranch): EuidRankingBranch => ({
    ...branch,
    // Keep `when` conditions as-is — they reference computed fields (e.g., entity.namespace)
    // that are shared from the actor pipeline, not target-namespace fields.
    ranking: branch.ranking.map((composition) => composition.map(transformAttr)),
  });

  return {
    ...baseDefinition,
    identityField: {
      ...identityField,
      euidRanking: {
        branches: identityField.euidRanking.branches.map(transformBranch),
      },
      documentsFilter: transformCondition(identityField.documentsFilter),
      // Field evaluations compute event-level values (entity.namespace from event.module).
      // For targets, we reuse the already-computed entity.namespace from the actor pipeline,
      // so we drop field evaluations entirely — they're handled by buildV2ActorResolution.
      fieldEvaluations: undefined,
    },
  };
}

function getTargetEntityDefinition(entityType: EntityType): EntityDefinitionWithoutId {
  return createTargetEntityDefinition(getEntityDefinitionWithoutId(entityType));
}

/**
 * Generates ESQL evaluation for a target entity EUID.
 * Reads from target-namespace fields (e.g., `user.target.email` instead of `user.email`).
 * Reuses the shared getEuidEsqlEvaluationFromDefinition with the transformed definition.
 */
export function getTargetEuidEsqlEvaluationFromDefinition(
  entityType: EntityType,
  options?: { withTypeId?: boolean }
): string {
  return getEuidEsqlEvaluationFromDefinition(
    entityType,
    getTargetEntityDefinition(entityType),
    options
  );
}

/**
 * Returns the list of target EUID source fields for the given entity type.
 */
export function getTargetEuidSourceFields(entityType: EntityType): string[] {
  const targetDef = getTargetEntityDefinition(entityType);
  const { identityField } = targetDef;

  if (isSingleFieldIdentity(identityField)) {
    return [identityField.singleField];
  }

  const fields: string[] = [];
  for (const branch of identityField.euidRanking.branches) {
    for (const composition of branch.ranking) {
      for (const attr of composition) {
        if (isEuidField(attr)) {
          fields.push(attr.field);
        }
      }
    }
  }
  return [...new Set(fields)];
}
