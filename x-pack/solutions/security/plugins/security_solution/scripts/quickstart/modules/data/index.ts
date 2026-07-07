/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
import crypto from 'crypto';

/**
 * A basic function to generate random data filling out a document. Useful for forcing
 * Elasticsearch to handle large amounts of data in a single doc.
 * @param numFields Number of fields to generate in each document
 * @param fieldSize Number of bytes to generate for each field
 * @returns Object representing the new document
 */
export const buildLargeDocument = ({
  numFields,
  fieldSize,
}: {
  numFields: number;
  fieldSize: number;
}): Record<string, string> => {
  const doc: Record<string, string> = {};
  range(numFields).forEach((idx) => {
    doc[`field_${idx}`] = crypto.randomBytes(fieldSize).toString('hex');
  });
  return doc;
};

export const buildLargeNestedDocument = ({
  fieldsPerObject,
  levels,
  fieldSize,
}: {
  fieldsPerObject: number;
  levels: number;
  fieldSize: number;
}): Record<string, unknown> => {
  if (levels === 1) {
    return buildLargeDocument({ numFields: fieldsPerObject, fieldSize });
  } else {
    const doc: Record<string, unknown> = {};
    range(fieldsPerObject).forEach((idx) => {
      doc[`level_${levels}_field${idx}`] = buildLargeNestedDocument({
        fieldsPerObject,
        levels: levels - 1,
        fieldSize,
      });
    });
    return doc;
  }
};

export const addTimestampToDoc = ({
  timestamp = new Date(),
  doc,
}: {
  timestamp?: Date;
  doc: Record<string, unknown>;
}): Record<string, unknown> => {
  doc['@timestamp'] = timestamp;
  return doc;
};

export const addFieldToDoc = ({
  fieldName,
  fieldValue,
  doc,
}: {
  fieldName: string;
  fieldValue: unknown;
  doc: Record<string, unknown>;
}): Record<string, unknown> => {
  doc[fieldName] = fieldValue;
  return doc;
};
