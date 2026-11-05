/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NO_STACKTRACE } from './search_request';
import type { ErrorGroupBucket, ErrorsAggregations } from './search_response';
import { toHasMoreErrors, toJsErrors } from './to_js_errors';

const group = (
  type: string,
  stacktrace: string,
  count: number,
  message: string | null,
  lastSeen: number | null
): ErrorGroupBucket => {
  return {
    key: [type, stacktrace],
    doc_count: count,
    message: {
      hits: { hits: message === null ? [] : [{ fields: { 'exception.message': [message] } }] },
    },
    lastSeen: { value: lastSeen },
  };
};

const aggregations = (groups: ErrorGroupBucket[], otherCount = 0): ErrorsAggregations => {
  return {
    environments: { buckets: [] },
    environmentNames: { buckets: [] },
    environmentNotDefined: { doc_count: 0 },
    inEnvironment: {
      exceptions: { groups: { buckets: groups, sum_other_doc_count: otherCount } },
    },
  };
};

describe('toJsErrors', () => {
  it('returns no groups without aggregations', () => {
    expect(toJsErrors(undefined)).toEqual([]);
  });

  it('maps each type and stack trace, in the order of the search', () => {
    const errors = toJsErrors(
      aggregations([
        group('TypeError', NO_STACKTRACE, 4, 'no stack', 7000),
        group('RangeError', 'RangeError\n at b.js', 3, null, null),
        group('TypeError', 'TypeError: x\n at a.js', 2, 'x is undefined', 5000),
      ])
    );

    expect(errors).toEqual([
      {
        type: 'TypeError',
        stacktrace: null,
        message: 'no stack',
        count: 4,
        lastSeen: new Date(7000).toISOString(),
      },
      {
        type: 'RangeError',
        stacktrace: 'RangeError\n at b.js',
        message: null,
        count: 3,
        lastSeen: null,
      },
      {
        type: 'TypeError',
        stacktrace: 'TypeError: x\n at a.js',
        message: 'x is undefined',
        count: 2,
        lastSeen: new Date(5000).toISOString(),
      },
    ]);
  });

  it('tells whether less frequent groups were left out', () => {
    expect(toHasMoreErrors(undefined)).toBe(false);
    expect(toHasMoreErrors(aggregations([]))).toBe(false);
    expect(toHasMoreErrors(aggregations([], 3))).toBe(true);
  });
});
