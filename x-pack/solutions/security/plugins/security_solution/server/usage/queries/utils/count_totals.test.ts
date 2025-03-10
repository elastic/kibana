/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countTotals } from './count_totals';

describe('count_totals', () => {
  test('returns 0 if given an empty array', () => {
    const result = countTotals([]);
    expect(result).toEqual<number>(0);
  });

  test('returns 0 if given a single cardinality with a null value', () => {
    const result = countTotals([
      {
        doc_count: 0,
        cardinality: { value: null },
      },
    ]);
    expect(result).toEqual<number>(0);
  });

  test('it counts a single cardinality by returning that single number', () => {
    const result = countTotals([
      {
        doc_count: 8,
        cardinality: { value: 5 },
      },
    ]);
    expect(result).toEqual<number>(5);
  });

  test('it can count 2 cardinalities by adding their sum up correctly', () => {
    const result = countTotals([
      {
        doc_count: 8,
        cardinality: { value: 5 },
      },
      {
        doc_count: 8,
        cardinality: { value: 3 },
      },
    ]);
    expect(result).toEqual<number>(8);
  });

  test('it can will skip a single cardinality value if that value is null', () => {
    const result = countTotals([
      {
        doc_count: 8,
        cardinality: { value: 5 },
      },
      {
        doc_count: 0,
        cardinality: { value: null },
      },
    ]);
    expect(result).toEqual<number>(5);
  });

  test('it can will skip a single cardinality value if that value is null but add the 3rd one', () => {
    const result = countTotals([
      {
        doc_count: 8,
        cardinality: { value: 5 },
      },
      {
        doc_count: 0,
        cardinality: { value: null },
      },
      {
        doc_count: 0,
        cardinality: { value: 3 },
      },
    ]);
    expect(result).toEqual<number>(8);
  });
});
