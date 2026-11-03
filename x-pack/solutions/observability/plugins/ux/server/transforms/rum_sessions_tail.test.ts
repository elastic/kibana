/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { resolveNewTailSessionIds } from './rum_sessions_tail';

describe('resolveNewTailSessionIds', () => {
  it('returns tail ids that are not already in the session index', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce({
        aggregations: {
          sessions: { buckets: [{ key: 'new' }, { key: 'old' }, { key: '' }] },
        },
      })
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { session: { id: 'old' } } }] },
      });
    const client = { search } as unknown as ElasticsearchClient;

    await expect(
      resolveNewTailSessionIds({
        client,
        rangeFrom: '2026-08-15T12:00:00.000Z',
        rangeTo: 'now',
        serviceName: 'shop',
      })
    ).resolves.toEqual(['new']);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('skips the index lookup when the tail is empty', async () => {
    const search = jest.fn().mockResolvedValueOnce({
      aggregations: { sessions: { buckets: [] } },
    });
    const client = { search } as unknown as ElasticsearchClient;

    await expect(
      resolveNewTailSessionIds({
        client,
        rangeFrom: '2026-08-15T12:00:00.000Z',
        rangeTo: 'now',
      })
    ).resolves.toEqual([]);
    expect(search).toHaveBeenCalledTimes(1);
  });
});
