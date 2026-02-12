/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, EuidAttribute } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { getFieldValue, isEuidField } from './commons';

export function getEuidFromObject(entityType: EntityType, doc: any) {
  if (!doc) {
    return undefined;
  }

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
