/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { isEuidField } from './commons';

export interface IdentitySourceFields {
  /** Fields that participate in identity (EUID composition). Derived from euidFields.
   * At least one is typically required for a valid identity; the exact rule is in documentsFilter.
   */
  requiresOneOf: string[];
  /** All field names used in EUID composition, deduplicated.
   * This can be used to extract the ID fields from the document.
   */
  identitySourceFields: string[];
}

/**
 * Returns the identity source field names for a given entity type.
 * When a composition field is a fieldEvaluation destination (e.g. entity.namespace),
 * the evaluation's source field (e.g. event.module) is returned instead, since the
 * destination is computed and not stored.
 *
 * @param entityType - The entity type (e.g. 'host', 'user', 'service')
 * @returns requiresOneOf (same as identitySourceFields) and identitySourceFields from euidFields
 */
export function getEuidSourceFields(entityType: EntityType): IdentitySourceFields {
  const {
    identityField: { euidFields, fieldEvaluations },
  } = getEntityDefinitionWithoutId(entityType);
  const evaluationDestinationToSource = new Map(
    (fieldEvaluations ?? []).map((e) => [e.destination, e.source])
  );
  const identitySourceFields = Array.from(
    new Set(
      euidFields.flatMap((instr) =>
        instr.composition.filter(isEuidField).map((attr) => {
          const field = attr.field;
          // if the field is a fieldEvaluation destination, return the source field
          return evaluationDestinationToSource.get(field) ?? field;
        })
      )
    )
  );
  return {
    requiresOneOf: identitySourceFields,
    identitySourceFields,
  };
}
