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
  /** Fields of which at least one must be present for identity to be valid. */
  requiresOneOf: string[];
  /** All field names used in EUID composition, deduplicated in definition order. */
  identitySourceFields: string[];
}

/**
 * Returns the identity source field names for a given entity type.
 * Used when projecting or persisting identity data (e.g. risk-score ESQL or entity store updates).
 *
 * @param entityType - The entity type (e.g. 'host', 'user', 'service')
 * @returns requiresOneOf and deduplicated identitySourceFields from the entity definition
 */
export function getIdentitySourceFields(entityType: EntityType): IdentitySourceFields {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  const seen = new Set<string>();
  const identitySourceFields: string[] = [];
  for (const composedField of identityField.euidFields) {
    for (const attr of composedField) {
      if (isEuidField(attr) && !seen.has(attr.field)) {
        seen.add(attr.field);
        identitySourceFields.push(attr.field);
      }
    }
  }
  return {
    requiresOneOf: [...identityField.requiresOneOfFields],
    identitySourceFields,
  };
}
