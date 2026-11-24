/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TermsBucket {
  key: string | number;
  doc_count: number;
}

const isTermsBucket = (value: unknown): value is TermsBucket =>
  typeof value === 'object' &&
  value !== null &&
  'key' in value &&
  (typeof value.key === 'string' || typeof value.key === 'number') &&
  'doc_count' in value &&
  typeof value.doc_count === 'number';

/** Buckets of one terms aggregation. The rules client returns aggregations untyped. */
export const termsBuckets = (
  aggregations: Record<string, unknown> | undefined,
  name: string
): TermsBucket[] => {
  const aggregation = aggregations?.[name];
  return typeof aggregation === 'object' &&
    aggregation !== null &&
    'buckets' in aggregation &&
    Array.isArray(aggregation.buckets)
    ? aggregation.buckets.filter(isTermsBucket)
    : [];
};
