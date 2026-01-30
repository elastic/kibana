/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, EuidAttribute } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';

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
      if (attr.field !== undefined) {
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

export function getFieldValue(doc: any, field: string): string | undefined {
  const brokenFields = field.split('.');

  let fieldInObject = doc;
  for (const brokenField of brokenFields) {
    fieldInObject = fieldInObject[brokenField];
    if (!fieldInObject) {
      return undefined;
    }
  }

  // In theory we should not have multi valued fields.
  // However, it can still happen that elasticsearch
  // client returns an array of values.
  if (Array.isArray(fieldInObject)) {
    if (fieldInObject.length > 0) {
      return fieldInObject[0];
    } else {
      throw new Error(`Field ${field} is an array but has no values`);
    }
  }

  if (typeof fieldInObject === 'object') {
    throw new Error(`Field ${field} is an object, can't convert to value`);
  }

  return String(fieldInObject);
}
