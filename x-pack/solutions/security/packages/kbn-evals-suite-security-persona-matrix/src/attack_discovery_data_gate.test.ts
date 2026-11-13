/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { AD_MIN_ENDPOINT_ALERTS, assertAdDataGate } from './attack_discovery_data_gate';

const log = { info: jest.fn() } as unknown as ToolingLog;
const WINDOW = {
  index: 'alerts',
  start: '2026-03-01T00:00:00.000Z',
  end: '2026-04-01T00:00:00.000Z',
};

/** Answers the endpoint count (query has must_not) and the Chrysalis count separately. */
const clientWith = ({ endpoint, chrysalis }: { endpoint: number; chrysalis: number }) => {
  const count = jest.fn(async ({ query }: { query: { bool: { must_not?: unknown } } }) => ({
    count: query.bool.must_not ? endpoint : chrysalis,
  }));
  return { count, esClient: { count } as unknown as EsClient };
};

describe('assertAdDataGate', () => {
  afterEach(() => jest.clearAllMocks());

  it('passes on the clean 95-alert corpus', async () => {
    const { esClient } = clientWith({ endpoint: 95, chrysalis: 0 });
    await expect(assertAdDataGate({ esClient, log, ...WINDOW })).resolves.toBeUndefined();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('endpoint=95'));
  });

  it('fails when any Chrysalis signal is in the window', async () => {
    const { esClient } = clientWith({ endpoint: 95, chrysalis: 3 });
    await expect(assertAdDataGate({ esClient, log, ...WINDOW })).rejects.toThrow('chrysalis=3');
  });

  it('fails when the endpoint corpus is short', async () => {
    const { esClient } = clientWith({ endpoint: AD_MIN_ENDPOINT_ALERTS - 1, chrysalis: 0 });
    await expect(assertAdDataGate({ esClient, log, ...WINDOW })).rejects.toThrow(
      `endpoint=${AD_MIN_ENDPOINT_ALERTS - 1}`
    );
  });

  it('counts only the index and time window AD reads', async () => {
    const { esClient, count } = clientWith({ endpoint: 95, chrysalis: 0 });
    await assertAdDataGate({ esClient, log, ...WINDOW });
    expect(count).toHaveBeenCalledTimes(2);
    for (const [request] of count.mock.calls) {
      expect(request).toMatchObject({
        index: 'alerts',
        query: {
          bool: {
            filter: expect.arrayContaining([
              { range: { '@timestamp': { gte: WINDOW.start, lt: WINDOW.end } } },
            ]),
          },
        },
      });
    }
  });
});
