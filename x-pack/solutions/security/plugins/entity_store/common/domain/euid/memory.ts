/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, EuidAttribute } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { getDocument, getFieldValue, isEuidField } from './commons';

/**
 * Constructs an entity id from the provided entity type and document.
 *
 * It supports both flattened and nested document shapes.
 * If a document contains `_source` property, it will be unwrapped before processing.
 *
 * Example usage:
 * ```ts
 * import { getEuidFromObject } from './memory';
 *
 * const euid = getEuidFromObject('host', { host: { name: 'server1', domain: 'example.com' } });
 * // euid may look like:
 * // 'host:server1.example.com'
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @param doc - The document to derive entity id from. May be a flattened or nested shape.
 * @returns An entity id string, or undefined if the document does not contain enough identifying information.
 */
export function getEuidFromObject(entityType: EntityType, doc: any) {
  if (!doc) {
    return undefined;
  }

  doc = getDocument(doc);
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  const composedId = getComposedFieldValues(doc, identityField.euidFields);
  if (composedId.length === 0) {
    return undefined;
  }

  return `${entityType}:${composedId.join('')}`;
}

function getComposedFieldValues(doc: any, euidFields: EuidAttribute[][]): string[] {
  for (const composedFields of euidFields) {
    const composedFieldValues = composedFields.map((attr) => {
      if (isEuidField(attr)) {
        return getFieldValue(doc, attr.field);
      }
      return attr.separator;
    });

    if (composedFieldValues.every((value) => value !== undefined)) {
      return composedFieldValues;
    }
  }
  return [];
}
