/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import { evaluate } from './evaluate';

jest.mock('@kbn/evals', () => ({
  evaluate: { extend: jest.fn().mockReturnValue({}) },
}));

interface TraceFixtures {
  traceEsClient: [
    (
      dependencies: { esClient: EsClient; log: { info: jest.Mock } },
      use: (client: EsClient) => Promise<void>
    ) => Promise<void>,
    { scope: string }
  ];
}

describe('rule-tuning traceEsClient fixture', () => {
  const originalUrl = process.env.TRACING_ES_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.TRACING_ES_URL;
    else process.env.TRACING_ES_URL = originalUrl;
  });

  it('overrides the golden-cluster default with the worker-scoped local Scout client', async () => {
    process.env.TRACING_ES_URL = 'https://golden.example.invalid:443';
    expect(evaluate).toBeDefined();
    const fixtures = (base.extend as jest.Mock).mock.calls[0][0] as TraceFixtures;
    expect(fixtures.traceEsClient).toBeDefined();
    const [body, options] = fixtures.traceEsClient;
    expect(options).toEqual({ scope: 'worker' });
    const esClient = { local: true } as unknown as EsClient;
    const use = jest.fn().mockResolvedValue(undefined);

    await body({ esClient, log: { info: jest.fn() } }, use);

    expect(use).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith(esClient);
  });
});
