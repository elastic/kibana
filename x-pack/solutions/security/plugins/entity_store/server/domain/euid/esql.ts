/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { esqlIsNotNullOrEmpty } from '../esql/strings';

export function getEuidEsqlFilter(entityType: EntityType) {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  return identityField.requiresOneOfFields
    .map((field) => `(${esqlIsNotNullOrEmpty(field)})`)
    .join(' OR ');
}

export function getEuidEsqlEvaluation(entityType: EntityType) {
  const { identityField } = getEntityDefinitionWithoutId(entityType);

  if (identityField.euidFields.length === 0) {
    throw new Error('No euid fields found, invalid euid logic definition');
  }

  // If only one field is defined, it must exist, no CASE logic is needed
  if (identityField.euidFields.length === 1) {
    if (identityField.euidFields[0][0].separator) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }

    return `CONCAT("${entityType}:", ${identityField.euidFields[0][0].field})`;
  }

  const euidLogic = identityField.euidFields.map((composedField) => {
    if (composedField.length === 1) {
      if (composedField[0].separator) {
        throw new Error('Separator found in single field, invalid euid logic definition');
      }
    }

    const caseBooleanOp = composedField
      .filter((field) => field.field)
      .map((field) => `${esqlIsNotNullOrEmpty(field.field)}`)
      .join(' AND ');

    if (composedField.length === 1) {
      return `(${caseBooleanOp}), ${composedField[0].field}`;
    }

    const evaluations = composedField
      .map((field) => (field.field ? field.field : `"${field.separator}"`))
      .join(', ');

    const concatLogic = `CONCAT(${evaluations})`;

    return `(${caseBooleanOp}), ${concatLogic}`;
  });

  return `CONCAT("${entityType}:", CASE(${euidLogic.join(',\n')}, NULL))`;
}
