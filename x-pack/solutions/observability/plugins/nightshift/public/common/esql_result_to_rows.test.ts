/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlResultToRows } from './esql_result_to_rows';

describe('esqlResultToRows', () => {
  it('keys every row value by its column name', () => {
    expect(
      esqlResultToRows({
        columns: [{ name: '@timestamp' }, { name: 'message' }],
        values: [
          ['2026-09-30T10:00:00.000Z', 'GET /health 200'],
          ['2026-09-30T10:00:01.000Z', null],
        ],
      })
    ).toEqual([
      { '@timestamp': '2026-09-30T10:00:00.000Z', message: 'GET /health 200' },
      { '@timestamp': '2026-09-30T10:00:01.000Z', message: null },
    ]);
  });

  it('returns no rows for an empty result', () => {
    expect(esqlResultToRows({ columns: [{ name: 'message' }], values: [] })).toEqual([]);
  });
});
