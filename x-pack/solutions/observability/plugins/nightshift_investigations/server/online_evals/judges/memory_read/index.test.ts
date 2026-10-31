/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { memoryReadJudge } from '.';

const round = {
  input: { message: 'Investigate checkout alert' },
  steps: [],
  response: { message: 'Checkout DB connection pool exhausted.' },
};

describe('nightshift_memory_read_judge', () => {
  it('computes opened/recalled precision from reference_data', async () => {
    const { scores } = await memoryReadJudge.evaluate({
      round,
      referenceData: {
        recalled_ids: ['mem-1', 'mem-2', 'cortex-1'],
        opened_ids: ['mem-1', 'cortex-1'],
      },
      log: loggingSystemMock.createLogger(),
    });

    expect(scores).toEqual([
      {
        name: 'memory_read_utility',
        score: 0.6667,
        label: 'RECALLED_OPENED',
        explanation: 'Agent opened 2 of 3 recalled/hydrated items.',
      },
    ]);
  });

  it('labels RECALLED_NOT_OPENED when recalled items were not opened', async () => {
    const { scores } = await memoryReadJudge.evaluate({
      round,
      referenceData: {
        recalled_ids: ['mem-1', 'mem-2'],
        opened_ids: [],
      },
      log: loggingSystemMock.createLogger(),
    });

    expect(scores).toEqual([
      {
        name: 'memory_read_utility',
        score: 0,
        label: 'RECALLED_NOT_OPENED',
        explanation: 'Agent opened 0 of 2 recalled/hydrated items.',
      },
    ]);
  });

  it('returns no scores when nothing was recalled or opened', async () => {
    const { scores } = await memoryReadJudge.evaluate({
      round,
      referenceData: {},
      log: loggingSystemMock.createLogger(),
    });

    expect(scores).toEqual([]);
  });
});
