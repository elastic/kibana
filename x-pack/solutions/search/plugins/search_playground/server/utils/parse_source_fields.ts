/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchRetrieverContentField } from '../types';

export const MAX_SOURCE_FIELDS_PER_INDEX = 100;

const sanitizeFieldList = (fields: string[], index: string): string[] => {
  if (fields.some((field) => typeof field !== 'string' || field.length === 0)) {
    throw new Error(`source_fields for index "${index}" must contain non-empty strings`);
  }
  const uniqueFields = [...new Set(fields as string[])];
  if (uniqueFields.length > MAX_SOURCE_FIELDS_PER_INDEX) {
    throw new Error(
      `source_fields for index "${index}" exceeds the maximum of ${MAX_SOURCE_FIELDS_PER_INDEX} fields`
    );
  }
  return uniqueFields;
};

export const parseSourceFields = (sourceFields: string): ElasticsearchRetrieverContentField => {
  const result: ElasticsearchRetrieverContentField = {};
  const parsedSourceFields = JSON.parse(sourceFields);
  if (typeof parsedSourceFields !== 'object')
    throw new Error('source_fields must be a JSON object');
  if (Array.isArray(parsedSourceFields)) throw new Error('source_fields must be a JSON object');
  Object.entries(parsedSourceFields).forEach(([index, fields]) => {
    if (Array.isArray(fields)) {
      if (fields.length === 0) throw new Error('source_fields index value cannot be empty');
      const uniqueFields = sanitizeFieldList(fields, index);
      result[index] = uniqueFields.length > 1 ? uniqueFields : uniqueFields[0];
    } else if (typeof fields === 'string') {
      if (fields.length === 0) {
        throw new Error(`source_fields for index "${index}" must contain non-empty strings`);
      }
      result[index] = fields;
    } else {
      throw new Error('source_fields index value must be an array or string');
    }
  });
  return result;
};
