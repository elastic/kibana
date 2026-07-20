/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createRunDataClient } from './run_data_client';

describe('createRunDataClient listRuns', () => {
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const createClient = (search: jest.Mock) =>
    createRunDataClient({
      esClient: { search } as unknown as ElasticsearchClient,
      logger,
      spaceId: 'default',
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns runs with a match_all query when reportId is omitted', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: { total: 0, hits: [] },
    });
    const client = createClient(search);

    await client.listRuns({ page: 1, perPage: 20 });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { match_all: {} },
      })
    );
  });

  it('returns runs filtered by report_id when reportId is set', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        total: 1,
        hits: [
          {
            _source: {
              run_id: 'run-1',
              space_id: 'default',
              created_by: 'user',
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
              input_type: 'report_id',
              report_id: 'report-abc',
              depth: 'full',
              status: 'succeeded',
            },
          },
        ],
      },
    });
    const client = createClient(search);

    const result = await client.listRuns({ reportId: 'report-abc', perPage: 1 });

    expect(result).toEqual({
      runs: [
        expect.objectContaining({
          runId: 'run-1',
          report_id: 'report-abc',
        }),
      ],
      total: 1,
      page: 1,
      perPage: 1,
    });
  });

  it('queries with a term filter on report_id when reportId is set', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: { total: 0, hits: [] },
    });
    const client = createClient(search);

    await client.listRuns({ reportId: 'report-abc', perPage: 1 });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { term: { report_id: 'report-abc' } },
        size: 1,
        sort: [{ created_at: { order: 'desc' } }],
      })
    );
  });
});
