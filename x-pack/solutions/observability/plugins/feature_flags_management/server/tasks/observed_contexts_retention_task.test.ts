/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { OBSERVED_CONTEXTS_INDEX } from '../storage/indices';
import { runRetention } from './observed_contexts_retention_task';

describe('runRetention', () => {
  const logger = loggingSystemMock.createLogger();
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  const run = (signal: AbortSignal) =>
    runRetention(
      {
        logger,
        retention: moment.duration(30, 'days'),
        getEsClient: async () => esClient,
        now: () => new Date('2026-03-31T00:00:00.000Z'),
      },
      signal
    );

  it('deletes contexts last seen before the retention', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 2 });
    const { signal } = new AbortController();
    await run(signal);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: OBSERVED_CONTEXTS_INDEX,
        conflicts: 'proceed',
        query: { range: { last_seen: { lt: '2026-03-01T00:00:00.000Z' } } },
      }),
      { signal }
    );
  });

  it('returns quietly when aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    esClient.deleteByQuery.mockRejectedValue(new Error('aborted'));
    await expect(run(controller.signal)).resolves.toBeUndefined();
  });

  it('throws a retryable error on failure', async () => {
    esClient.deleteByQuery.mockRejectedValue(new Error('boom'));
    await expect(run(new AbortController().signal)).rejects.toThrow(
      'Unable to apply the observed contexts retention: boom'
    );
  });
});
