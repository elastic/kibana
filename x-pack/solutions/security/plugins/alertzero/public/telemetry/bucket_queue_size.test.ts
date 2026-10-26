/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bucketQueueSize } from './bucket_queue_size';

describe('bucketQueueSize', () => {
  it.each([
    [0, '0'],
    [1, '1_10'],
    [10, '1_10'],
    [11, '11_50'],
    [50, '11_50'],
    [51, '51_200'],
    [200, '51_200'],
    [201, 'gt_200'],
    [10_000, 'gt_200'],
  ] as const)('reports %d open proposals as %s', (openCount, bucket) => {
    expect(bucketQueueSize(openCount)).toBe(bucket);
  });

  it('reports a negative count as empty', () => {
    expect(bucketQueueSize(-1)).toBe('0');
  });
});
