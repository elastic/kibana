/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryPlan } from './types';
import { assertValidLimit, sourceCommandOf } from './utils';

const planOf = (engine: QueryPlan['engine']): QueryPlan => ({
  index: 0,
  sourceIndex: 0,
  indexPattern: 'metrics-example-*',
  attributes: [],
  engine,
});

describe('assertValidLimit', () => {
  it.each([1, 100, 9999])('accepts the limit %s', (limit) => {
    expect(() => assertValidLimit(limit, 'list query')).not.toThrow();
  });

  it.each([0, -1, 1.5, NaN])('rejects the limit %s', (limit) => {
    expect(() => assertValidLimit(limit, 'list query')).toThrow(RangeError);
  });

  it('names the query and the limit in the message', () => {
    expect(() => assertValidLimit(0, 'attribute values query')).toThrow(
      'attribute values query limit must be a positive integer, got 0'
    );
  });
});

describe('sourceCommandOf', () => {
  it('reads the time-series indices of the pattern under TS', () => {
    expect(sourceCommandOf(planOf('TS'))).toBe('TS metrics-example-*');
  });

  it('reads the other indices of the pattern under FROM, with the index mode', () => {
    expect(sourceCommandOf(planOf('FROM'))).toBe('FROM metrics-example-* METADATA _index_mode');
  });
});
