/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBackfillRowsFromResponse } from './utils';
import type { Backfill, BackfillRow } from '../../types';

describe('getBackfillRowsFromResponse', () => {
  it('should return an empty array when the input is an empty array', () => {
    const input: Backfill[] = [];
    const output: BackfillRow[] = getBackfillRowsFromResponse(input);
    expect(output).toEqual([]);
  });

  it('should calculate total, completed, and error counts correctly', () => {
    const input: Backfill[] = [
      {
        id: '1',
        created_at: '2023-01-01T00:00:00Z',
        duration: '2h',
        enabled: true,
        rule: {
          id: 'rule-1',
          name: 'Test Rule',
          tags: ['tag1'],
          rule_type_id: 'type-1',
          params: {},
          api_key_owner: null,
          api_key_created_by_user: null,
          consumer: 'consumer-1',
          enabled: true,
          schedule: { interval: '1h' },
          created_by: null,
          updated_by: null,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          revision: 1,
        },
        space_id: 'space-1',
        start: '2023-01-01T00:00:00Z',
        status: 'running',
        schedule: [
          { run_at: '2023-01-01T01:00:00Z', status: 'complete', interval: '1h' },
          { run_at: '2023-01-01T02:00:00Z', status: 'error', interval: '1h' },
          { run_at: '2023-01-01T03:00:00Z', status: 'pending', interval: '1h' },
          { run_at: '2023-01-01T04:00:00Z', status: 'running', interval: '1h' },
          { run_at: '2023-01-01T05:00:00Z', status: 'running', interval: '1h' },
        ],
      },
      {
        id: '2',
        created_at: '2023-01-02T00:00:00Z',
        duration: '3h',
        enabled: true,
        rule: {
          id: 'rule-2',
          name: 'Test Rule 2',
          tags: ['tag2'],
          rule_type_id: 'type-2',
          params: {},
          api_key_owner: null,
          api_key_created_by_user: null,
          consumer: 'consumer-2',
          enabled: true,
          schedule: { interval: '1h' },
          created_by: null,
          updated_by: null,
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          revision: 1,
        },
        space_id: 'space-2',
        start: '2023-01-02T00:00:00Z',
        status: 'complete',
        schedule: [
          { run_at: '2023-01-02T01:00:00Z', status: 'complete', interval: '1h' },
          { run_at: '2023-01-02T02:00:00Z', status: 'complete', interval: '1h' },
        ],
      },
    ];

    const output: BackfillRow[] = getBackfillRowsFromResponse(input);

    expect(output[0]).toMatchObject({
      total: 5,
      complete: 1,
      error: 1,
      timeout: 0,
      pending: 1,
      running: 2,
    });

    expect(output[1]).toMatchObject({
      ...input[1],
      total: 2,
      complete: 2,
      error: 0,
      timeout: 0,
      pending: 0,
      running: 0,
    });
  });
});
