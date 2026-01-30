/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { EntityType, EuidAttribute } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { getFieldValue } from './memory';

interface FieldValue {
  [key: string]: any;
}

export function getEuidDslFilterBasedOnDocument(
  entityType: EntityType,
  doc: any
): QueryDslQueryContainer | undefined {
  if (!doc) {
    return undefined;
  }

  const { identityField } = getEntityDefinitionWithoutId(entityType);
  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(doc, identityField.euidFields);
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }

  const dsl: QueryDslQueryContainer = {
    bool: {
      filter: fieldsToBeFilteredOn.values.map((field) => ({ term: field })),
    },
  };

  const toBeFilteredOut = getFieldsToBeFilteredOut(identityField.euidFields, fieldsToBeFilteredOn);
  if (toBeFilteredOut.length > 0) {
    dsl.bool = {
      ...dsl.bool,
      must_not: toBeFilteredOut.map((field) => ({ exists: { field } })),
    };
  }

  return dsl;
}

function getFieldsToBeFilteredOn(
  obj: any,
  euidFields: EuidAttribute[][]
): { values: FieldValue[]; rankingPosition: number } {
  for (let i = 0; i < euidFields.length; i++) {
    const composedFields = euidFields[i];
    const fieldAttrs = composedFields.filter((attr) => attr.field !== undefined);
    const composedFieldValues = fieldAttrs.map((attr) => ({
      [attr.field!]: getFieldValue(obj, attr.field!),
    }));

    const allDefined = composedFieldValues.every((subObj) =>
      Object.values(subObj).every((v) => v !== undefined)
    );

    if (allDefined) {
      return { values: composedFieldValues, rankingPosition: i };
    }
  }
  return { values: [], rankingPosition: -1 };
}

function getFieldsToBeFilteredOut(
  euidFields: EuidAttribute[][],
  fieldsToBeFilteredOn: { values: FieldValue[]; rankingPosition: number }
): string[] {
  const euidFieldsBeforeRanking = euidFields.slice(0, fieldsToBeFilteredOn.rankingPosition);
  const fieldsNotInTheId = euidFieldsBeforeRanking
    .flatMap((composedFields) => composedFields.map((attr) => attr.field))
    .filter((field) => field !== undefined);

  const toFilterOut: string[] = [];
  for (const field of fieldsNotInTheId) {
    if (!fieldsToBeFilteredOn.values.some((f) => f[field]) && !toFilterOut.includes(field)) {
      toFilterOut.push(field);
    }
  }
  return toFilterOut;
}
