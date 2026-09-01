/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { runAdapter, UnknownAdapterError } from './run_adapter';
import type { AdapterRunContext, SourceHit } from './types';

const buildContext = (): AdapterRunContext => ({
  logger: loggingSystemMock.createLogger(),
  abortSignal: new AbortController().signal,
  now: () => new Date('2026-05-16T12:00:00.000Z'),
  fetchFn: jest.fn() as unknown as typeof fetch,
});

describe('runAdapter', () => {
  it('throws UnknownAdapterError for unsupported adapter_type values', async () => {
    const source = {
      _id: 'manual:1',
      _source: {
        adapter_type: 'manual',
        name: 'Analyst paste',
        config: {},
      },
    } as unknown as SourceHit;

    await expect(runAdapter(source, buildContext())).rejects.toMatchObject({
      name: UnknownAdapterError.name,
      message: expect.stringContaining('Known adapter types: rss, text_indicator_list, kev'),
    });
  });
});
