/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { esqlIsNotNullOrEmpty, esqlIsNullOrEmpty } from '../../esql/strings';
import {
  getFieldsToBeFilteredOn,
  getFieldsToBeFilteredOut,
  isEuidField,
  isEuidSeparator,
} from './commons';

export function getEuidEsqlFilterBasedOnDocument(entityType: EntityType, doc: any) {
  if (!doc) {
    return undefined;
  }

  const { identityField } = getEntityDefinitionWithoutId(entityType);
  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(doc, identityField.euidFields);
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }

  const onExpressions = Object.entries(fieldsToBeFilteredOn.values).map(
    ([field, value]) => `(${field} == "${value}")`
  );

  const toBeFilteredOut = getFieldsToBeFilteredOut(identityField.euidFields, fieldsToBeFilteredOn);
  const outExpressions = toBeFilteredOut.map((field) => `${esqlIsNullOrEmpty(field)}`);

  return `(${[...onExpressions, ...outExpressions].join(' AND ')})`;
}

export function getEuidEsqlDocumentsContainsIdFilter(entityType: EntityType) {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  return identityField.requiresOneOfFields
    .map((field) => `(${esqlIsNotNullOrEmpty(field)})`)
    .join(' OR ');
}

export function getEuidEsqlEvaluation(
  entityType: EntityType,
  { withTypeId = true }: { withTypeId?: boolean } = {}
) {
  const { identityField } = getEntityDefinitionWithoutId(entityType);

  if (identityField.euidFields.length === 0) {
    throw new Error('No euid fields found, invalid euid logic definition');
  }

  // If only one field is defined, it must exist, no CASE logic is needed
  if (identityField.euidFields.length === 1) {
    const firstField = identityField.euidFields[0][0];
    if (isEuidSeparator(firstField)) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }

    return appendTypeIdIfNeeded(entityType, firstField.field, withTypeId);
  }

  const euidLogic = identityField.euidFields.map((composedField) => {
    if (composedField.length === 1) {
      if (isEuidSeparator(composedField[0])) {
        throw new Error('Separator found in single field, invalid euid logic definition');
      }
    }

    const caseBooleanOp = composedField
      .filter(isEuidField)
      .map((field) => `${esqlIsNotNullOrEmpty(field.field)}`)
      .join(' AND ');

    if (isEuidSeparator(composedField[0])) {
      throw new Error('The first field of a composed field cannot be a separator');
    }

    if (composedField.length === 1) {
      return `(${caseBooleanOp}), ${composedField[0].field}`;
    }

    const evaluations = composedField
      .map((field) => (isEuidField(field) ? field.field : `"${field.separator}"`))
      .join(', ');

    const concatLogic = `CONCAT(${evaluations})`;

    return `(${caseBooleanOp}), ${concatLogic}`;
  });

  const idLogic = `CASE(${euidLogic.join(',\n')}, NULL)`;
  return appendTypeIdIfNeeded(entityType, idLogic, withTypeId);
}

function appendTypeIdIfNeeded(entityType: EntityType, euidLogic: string, withTypeId: boolean) {
  if (withTypeId) {
    return `CONCAT("${entityType}:", ${euidLogic})`;
  }
  return euidLogic;
}
