/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { EuidAttribute } from '../definitions/entity_schema';

interface FieldValue {
  [key: string]: string;
}

/**
 * Assumes the document has previously been validated
 * to not be null or undefined.
 */
export function getDocument(doc: any): any {
  if (doc._source && typeof doc._source === 'object') {
    return doc._source;
  }
  return doc;
}

function isEmpty(value: any): boolean {
  return value === undefined || value === null || value === '';
}

export function getFieldValue(doc: any, field: string): string | undefined {
  const flattenedValue = doc[field];
  const fieldInObject = isEmpty(flattenedValue) ? get(doc, field) : flattenedValue;

  if (isEmpty(fieldInObject)) {
    return undefined;
  }

  // In theory we should not have multi valued fields.
  // However, it can still happen that elasticsearch
  // client returns an array of values.
  if (Array.isArray(fieldInObject)) {
    if (fieldInObject.length > 0) {
      return String(fieldInObject[0]);
    } else {
      throw new Error(`Field ${field} is an array but has no values`);
    }
  }

  if (typeof fieldInObject === 'object') {
    throw new Error(
      `Field ${field} is an object, can't convert to value (value: ${JSON.stringify(
        fieldInObject
      )})`
    );
  }

  return String(fieldInObject);
}

export function getFieldsToBeFilteredOn(
  doc: any,
  euidFields: EuidAttribute[][]
): { values: FieldValue; rankingPosition: number } {
  for (let i = 0; i < euidFields.length; i++) {
    const composedFields = euidFields[i];
    const fieldAttrs = composedFields.filter(isEuidField);
    const composedFieldValues = fieldAttrs.reduce(
      (acc, attr) => ({
        ...acc,
        [attr.field]: getFieldValue(doc, attr.field),
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
  const fieldsNotInTheId = euidFieldsBeforeRanking.flatMap((composedFields) =>
    composedFields.filter(isEuidField).map((attr) => attr.field)
  );

  const toFilterOut: string[] = [];
  for (const field of fieldsNotInTheId) {
    if (!Object.keys(fieldsToBeFilteredOn.values).includes(field) && !toFilterOut.includes(field)) {
      toFilterOut.push(field);
    }
  }
  return toFilterOut;
}

export function isEuidField(attr: EuidAttribute) {
  return 'field' in attr;
}

export function isEuidSeparator(attr: EuidAttribute) {
  return 'separator' in attr;
}
