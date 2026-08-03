/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { checkPreExistingData } from './check_pre_existing_data';

const createMockEsClient = (response?: unknown, error?: Error) => {
  const search = error ? jest.fn().mockRejectedValue(error) : jest.fn().mockResolvedValue(response);
  return { search } as unknown as Parameters<typeof checkPreExistingData>[0];
};

const hitsResponse = (count: number) => ({
  hits: { total: { value: count, relation: 'eq' }, max_score: null, hits: [] },
});

describe('checkPreExistingData', () => {
  const indices = ['logs.otel*', 'metrics.otel*'];
  const start = '2026-03-31T10:00:00.000Z';

  it('returns true when documents exist before start', async () => {
    const client = createMockEsClient(hitsResponse(5));
    expect(await checkPreExistingData(client, indices, start)).toBe(true);
  });

  it('returns false when no documents exist before start', async () => {
    const client = createMockEsClient(hitsResponse(0));
    expect(await checkPreExistingData(client, indices, start)).toBe(false);
  });

  it('queries the 5-minute window before start', async () => {
    const client = createMockEsClient(hitsResponse(0));
    await checkPreExistingData(client, indices, start);

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: indices,
        size: 0,
        terminate_after: 1,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: '2026-03-31T09:55:00.000Z',
                    lt: start,
                  },
                },
              },
            ],
          },
        },
      })
    );
  });

  it('returns false on no shards available error', async () => {
    const error = new errors.ResponseError({
      statusCode: 503,
      body: {
        error: {
          type: 'search_phase_execution_exception',
          root_cause: [{ type: 'no_shard_available_action_exception' }],
        },
      },
      headers: {},
      warnings: [],
      meta: {} as never,
    });
    const client = createMockEsClient(undefined, error);
    expect(await checkPreExistingData(client, indices, start)).toBe(false);
  });

  it('returns false on unexpected errors', async () => {
    const client = createMockEsClient(undefined, new Error('Connection refused'));
    expect(await checkPreExistingData(client, indices, start)).toBe(false);
  });
});
