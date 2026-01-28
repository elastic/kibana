/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractFieldLineage, resolveBaseFields } from './esql_helpers';

describe('extractFieldLineage', () => {
  it('tracks renames and aggregation keys', () => {
    const query =
      'FROM logs | STATS count = COUNT(*) BY user.name | RENAME user.name AS username | KEEP username, count';
    const result = extractFieldLineage(query);

    expect(result.fieldRenames.get('username')).toBe('user.name');
    expect(result.aggregationKeys.has('user.name')).toBe(true);
    expect(result.dependencies.get('username')).toEqual(['user.name']);
    expect(result.outputColumns.has('username')).toBe(true);
    expect(result.outputColumns.has('count')).toBe(true);
  });

  it('tracks functions used in computed fields', () => {
    const query = 'FROM logs | EVAL normalized = ROUND(field1 / field2, 2)';
    const result = extractFieldLineage(query);
    const functions = result.fieldFunctions.get('normalized');

    expect(functions).toBeDefined();
    expect(Array.from(functions ?? []).map((fn) => fn.toLowerCase())).toContain('round');
  });

  it('tracks functions used in aggregation keys', () => {
    const query =
      'FROM logs | STATS count = COUNT(*) BY DATE_TRUNC("day", @timestamp) | KEEP count';
    const result = extractFieldLineage(query);
    const functions = Array.from(result.aggregationKeyFunctions).map((fn) => fn.toLowerCase());

    expect(functions).toContain('date_trunc');
  });
});

describe('resolveBaseFields', () => {
  const toSortedArray = (value: Set<string>) => Array.from(value).sort();

  it('resolves renamed and computed dependencies', () => {
    const query =
      'FROM logs | EVAL full_name = user.name | EVAL masked = SHA256(full_name) | RENAME masked AS masked_name | KEEP masked_name';
    const result = extractFieldLineage(query);
    const baseFields = resolveBaseFields('masked_name', result.dependencies, result.fieldRenames);

    expect(toSortedArray(baseFields)).toEqual(['user.name']);
  });

  it('falls back to the field when no dependencies exist', () => {
    const baseFields = resolveBaseFields('host.name', new Map(), new Map());

    expect(toSortedArray(baseFields)).toEqual(['host.name']);
  });
});
