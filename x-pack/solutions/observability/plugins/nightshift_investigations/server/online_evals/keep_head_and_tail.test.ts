/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keepHeadAndTail } from './keep_head_and_tail';

describe('keepHeadAndTail', () => {
  it.each([
    ['everything fits', [1, 1, 1], 3, { headEnd: 3, tailStart: 3, omitted: 0 }],
    [
      'a quarter from the start, the rest from the end',
      Array(10).fill(1),
      4,
      { headEnd: 1, tailStart: 7, omitted: 6 },
    ],
    [
      'budget the end leaves unused goes to the start',
      [1, 1, 1, 1, 4, 3],
      8,
      { headEnd: 4, tailStart: 5, omitted: 1 },
    ],
  ])('%s', (_case, sizes, budget, expected) => {
    expect(keepHeadAndTail(sizes, budget)).toEqual(expected);
  });
});
