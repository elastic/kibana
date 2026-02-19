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
  /** At least one must be present for identity to be valid.
   * This can be used to filter documents before the entity ID is calculated.
   */
  requiresOneOf: string[];
  /** All field names used in EUID composition, deduplicated
   * This can be used to extract the ID fields from the document.
   **/
  identitySourceFields: string[];
}

/**
 * Returns the identity source field names for a given entity type and
 * required fields for the entity ID.
 *
 * @param entityType - The entity type (e.g. 'host', 'user', 'service')
 * @returns requiresOneOf and identitySourceFields from the entity definition
 */
export function getEuidSourceFields(entityType: EntityType): IdentitySourceFields {
  const {
    identityField: { requiresOneOfFields, euidFields },
  } = getEntityDefinitionWithoutId(entityType);
  return {
    requiresOneOf: requiresOneOfFields,
    identitySourceFields: Array.from(
      new Set(
        euidFields.flatMap((composedField) =>
          composedField.filter(isEuidField).map((attr) => attr.field)
        )
      )
    ),
  };
}
