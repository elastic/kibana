/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { readFirstNumber } from './read_first_number';

const response = (columns: string[], values: unknown[][]) =>
  ({ columns: columns.map((name) => ({ name })), values }) as unknown as ESQLSearchResponse;

describe('readFirstNumber', () => {
  it('reads the named column of the first row, wherever it is', () => {
    expect(readFirstNumber(response(['entity_ids', 'value'], [[['x'], 7]]), 'value')).toBe(7);
  });

  it('reads an empty result as 0', () => {
    expect(readFirstNumber(response([], []), 'value')).toBe(0);
  });

  it('reads a null value as 0', () => {
    expect(readFirstNumber(response(['value'], [[null]]), 'value')).toBe(0);
  });

  it('throws instead of reading another column when the column is missing', () => {
    expect(() => readFirstNumber(response(['other'], [[7]]), 'value')).toThrow(/value/);
  });
});
