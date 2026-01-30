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
  [key: string]: string;
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
      filter: Object.entries(fieldsToBeFilteredOn.values).map(([field, value]) => ({
        term: { [field]: value },
      })),
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

export function getFieldsToBeFilteredOn(
  doc: any,
  euidFields: EuidAttribute[][]
): { values: FieldValue; rankingPosition: number } {
  for (let i = 0; i < euidFields.length; i++) {
    const composedFields = euidFields[i];
    const fieldAttrs = composedFields.filter((attr) => attr.field !== undefined);
    const composedFieldValues = fieldAttrs.reduce(
      (acc, attr) => ({
        ...acc,
        [attr.field!]: getFieldValue(doc, attr.field!),
      }),
      {}
    );

    if (Object.values(composedFieldValues).every((v) => v !== undefined)) {
      return { values: composedFieldValues, rankingPosition: i };
    }
  }
  return { values: {}, rankingPosition: -1 };
}

export function getFieldsToBeFilteredOut(
  euidFields: EuidAttribute[][],
  fieldsToBeFilteredOn: { values: FieldValue; rankingPosition: number }
): string[] {
  const euidFieldsBeforeRanking = euidFields.slice(0, fieldsToBeFilteredOn.rankingPosition);
  const fieldsNotInTheId = euidFieldsBeforeRanking
    .flatMap((composedFields) => composedFields.map((attr) => attr.field))
    .filter((field) => field !== undefined);

  const toFilterOut: string[] = [];
  for (const field of fieldsNotInTheId) {
    if (!Object.keys(fieldsToBeFilteredOn.values).includes(field) && !toFilterOut.includes(field)) {
      toFilterOut.push(field);
    }
  }
  return toFilterOut;
}
