/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseGranularSort } from './parse_granular_sort';

describe('parseGranularSort', () => {
  it('returns undefined when sort is missing or empty', () => {
    expect(parseGranularSort(undefined)).toBeUndefined();
    expect(parseGranularSort([])).toBeUndefined();
  });

  it('parses a single token', () => {
    expect(parseGranularSort(['name:desc'])).toEqual({
      sortField: 'name',
      sortOrder: 'desc',
    });
  });

  it('flattens comma-separated values in one array entry', () => {
    expect(parseGranularSort(['name:asc,updated_at:desc'])).toEqual({
      sortField: 'name',
      sortOrder: 'asc',
    });
  });

  it('uses the first repeated parameter token', () => {
    expect(parseGranularSort(['severity:asc', 'name:desc'])).toEqual({
      sortField: 'severity',
      sortOrder: 'asc',
    });
  });

  it('returns undefined for invalid sort field', () => {
    expect(parseGranularSort(['not_a_sort_field:asc'])).toBeUndefined();
  });

  it('returns undefined for invalid order token', () => {
    expect(parseGranularSort(['name:up'])).toBeUndefined();
  });
});
