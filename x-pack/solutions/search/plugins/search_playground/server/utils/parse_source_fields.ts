/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchRetrieverContentField } from '../types';

export const parseSourceFields = (sourceFields: string): ElasticsearchRetrieverContentField => {
  const result: ElasticsearchRetrieverContentField = {};
  const parsedSourceFields = JSON.parse(sourceFields);
  if (typeof parsedSourceFields !== 'object')
    throw new Error('source_fields must be a JSON object');
  if (Array.isArray(parsedSourceFields)) throw new Error('source_fields must be a JSON object');
  Object.entries(parsedSourceFields).forEach(([index, fields]) => {
    if (Array.isArray(fields)) {
      if (fields.length === 0) throw new Error('source_fields index value cannot be empty');
      result[index] = fields.length > 1 ? fields : fields[0];
    } else if (typeof fields === 'string') {
      result[index] = fields;
    } else {
      throw new Error('source_fields index value must be an array or string');
    }
  });
  return result;
};
