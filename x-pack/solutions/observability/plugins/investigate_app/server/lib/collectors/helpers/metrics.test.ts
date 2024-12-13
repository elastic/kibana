/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeMetrics } from './metrics';

describe('ComputeMetrics', () => {
  it('computes the metrics correctly', async () => {
    expect(computeMetrics([])).toMatchInlineSnapshot(`
      Object {
        "avg": 0,
        "max": 0,
        "min": 0,
        "p90": 0,
        "p95": 0,
      }
    `);
    expect(computeMetrics([10, 10, 100])).toMatchInlineSnapshot(`
      Object {
        "avg": 40,
        "max": 100,
        "min": 10,
        "p90": 100,
        "p95": 100,
      }
    `);

    const arr = Array.from({ length: 100 }, (_, i) => i);
    expect(computeMetrics(arr)).toMatchInlineSnapshot(`
      Object {
        "avg": 49.5,
        "max": 99,
        "min": 0,
        "p90": 90,
        "p95": 95,
      }
    `);
  });
});
