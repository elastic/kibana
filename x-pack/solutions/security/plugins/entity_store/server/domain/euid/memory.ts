/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, EuidAttribute } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';

export function getIdFromObject(entityType: EntityType, obj: any) {
  if (!obj) {
    return undefined;
  }

  const { identityField } = getEntityDefinitionWithoutId(entityType);

  const composedId = getComposedFieldValues(obj, identityField.euidFields);

  if (composedId.length === 0) {
    return undefined;
  }

  return `${entityType}:${composedId.join('')}`;
}

function getComposedFieldValues(obj: any, euidFields: EuidAttribute[][]): string[] {
  for (const composedFields of euidFields) {
    const composedFieldValues = composedFields.map((attr) => {
      if (attr.field !== undefined) {
        return getFieldValue(obj, attr.field);
      }
      return attr.separator;
    });

    if (composedFieldValues.every((value) => value !== undefined)) {
      return composedFieldValues;
    }
  }
  return [];
}

function getFieldValue(obj: any, field: string) {
  const brokenFields = field.split('.');

  let fieldInObject = obj;
  for (const brokenField of brokenFields) {
    fieldInObject = fieldInObject[brokenField];
    if (!fieldInObject) {
      return undefined;
    }
  }
  return fieldInObject;
}
