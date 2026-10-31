/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { memoryWriteJudge } from '.';

const round = {
  input: { message: 'Investigate checkout alert' },
  steps: [],
  response: { message: 'Checkout DB connection pool exhausted.' },
};

describe('nightshift_memory_write_judge', () => {
  it('aggregates applied writes into one score per store without exposing item IDs', async () => {
    const { scores } = await memoryWriteJudge.evaluate({
      round,
      referenceData: {
        applied_writes: [
          {
            store: 'cortex',
            item_id: 'payments-service',
            action: 'upsert',
            version: 2,
            after_content: '# Payments Service',
          },
          {
            store: 'semantic_memory',
            item_id: 'mem-empty',
            action: 'create',
            after_content: '   ',
          },
          {
            store: 'semantic_memory',
            item_id: 'mem-archived',
            action: 'archive_merged',
          },
        ],
      },
      log: loggingSystemMock.createLogger(),
    });

    expect(scores).toEqual([
      {
        name: 'memory_write_quality',
        score: 1,
        label: 'cortex:1/1',
        explanation: '1 of 1 cortex writes had content.',
      },
      {
        name: 'memory_write_quality',
        score: 0.5,
        label: 'semantic_memory:1/2',
        explanation: '1 of 2 semantic_memory writes had content.',
      },
    ]);
  });

  it('returns no scores when applied_writes is empty', async () => {
    const { scores } = await memoryWriteJudge.evaluate({
      round,
      referenceData: { applied_writes: [] },
      log: loggingSystemMock.createLogger(),
    });

    expect(scores).toEqual([]);
  });
});
