/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { OutputColumns, SourceFieldTypes } from './types';

/** `_field_caps` takes the field names in the URL, which is limited to 4kb, so they are requested in batches. */
const MAX_FIELDS_PARAM_LENGTH = 2000;

const toBatches = (fields: readonly string[]): string[][] => {
  const batches: string[][] = [];
  let current: string[] = [];
  let length = 0;
  for (const field of fields) {
    if (current.length > 0 && length + field.length + 1 > MAX_FIELDS_PARAM_LENGTH) {
      batches.push(current);
      current = [];
      length = 0;
    }
    current.push(field);
    length += field.length + 1;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
};

/** The types the given fields have in the source indices. Fields that are not mapped are left out. */
export const fetchSourceFieldTypes = async ({
  esClient,
  indices,
  fields,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  fields: readonly string[];
}): Promise<SourceFieldTypes> => {
  const responses = await Promise.all(
    toBatches(fields).map((batch) =>
      esClient.fieldCaps({
        index: indices,
        fields: batch,
        ignore_unavailable: true,
        allow_no_indices: true,
      })
    )
  );
  const types = new Map<string, string[]>();
  for (const response of responses) {
    for (const [field, capabilities] of Object.entries(response.fields)) {
      types.set(field, Object.keys(capabilities));
    }
  }
  return types;
};

/** The columns, and their types, that the query produces. */
export const fetchOutputColumns = async ({
  esClient,
  query,
}: {
  esClient: ElasticsearchClient;
  query: string;
}): Promise<OutputColumns> => {
  const response = await esClient.esql.query({ query: `${query} | LIMIT 0` });
  return new Map(response.columns.map(({ name, type }) => [name, type]));
};
