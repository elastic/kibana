/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  AD_MAX_ENDPOINT_ALERTS,
  AD_MIN_ENDPOINT_ALERTS,
  assertAdDataGate,
} from './attack_discovery_data_gate';

const log = { info: jest.fn() } as unknown as ToolingLog;
const WINDOW = {
  index: 'alerts',
  start: '2026-03-01T00:00:00.000Z',
  end: '2026-04-01T00:00:00.000Z',
};

/**
 * Answers the corpus count (query whose must_not mentions the corpus ids filter), the
 * Chrysalis count, and the foreign count by inspecting the ids filter presence.
 */
const clientWith = ({
  corpus,
  foreign = 0,
  chrysalis,
}: {
  corpus: number;
  foreign?: number;
  chrysalis: number;
}) => {
  const count = jest.fn(
    async ({ query }: { query: { bool: { must_not?: unknown; filter?: unknown } } }) => {
      const filters = (query.bool.filter ?? []) as Array<Record<string, unknown>>;
      const hasIdsFilter = filters.some((f) => f.ids !== undefined);
      const mustNot = (query.bool.must_not ?? []) as Array<Record<string, unknown>>;
      const mustNotIds = mustNot.some((f) => f.ids !== undefined);
      // Corpus count: ids filter present and no ids in must_not.
      // Foreign count: ids only in must_not. Chrysalis: no ids anywhere.
      return { count: hasIdsFilter ? corpus : mustNotIds ? foreign : chrysalis };
    }
  );
  return { count, esClient: { count } as unknown as EsClient };
};

const CORPUS_IDS = ['alert-1', 'alert-2'];
const GATE = { ...WINDOW, corpusIds: CORPUS_IDS };

describe('assertAdDataGate', () => {
  afterEach(() => jest.clearAllMocks());

  it('passes on the clean 95-alert corpus', async () => {
    const { esClient } = clientWith({ corpus: 95, chrysalis: 0 });
    await expect(assertAdDataGate({ esClient, log, ...GATE })).resolves.toBeUndefined();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('corpus=95'));
  });

  it('fails when any Chrysalis signal is in the window', async () => {
    const { esClient } = clientWith({ corpus: 95, chrysalis: 3 });
    await expect(assertAdDataGate({ esClient, log, ...GATE })).rejects.toThrow('chrysalis=3');
  });

  it('fails when the positively-identified corpus is short', async () => {
    const { esClient } = clientWith({ corpus: AD_MIN_ENDPOINT_ALERTS - 1, chrysalis: 0 });
    await expect(assertAdDataGate({ esClient, log, ...GATE })).rejects.toThrow(
      `corpus=${AD_MIN_ENDPOINT_ALERTS - 1}`
    );
  });

  it('fails when the positively-identified corpus exceeds the corpus size', async () => {
    const { esClient } = clientWith({ corpus: AD_MAX_ENDPOINT_ALERTS + 1, chrysalis: 0 });
    await expect(assertAdDataGate({ esClient, log, ...GATE })).rejects.toThrow(
      `corpus=${AD_MAX_ENDPOINT_ALERTS + 1}`
    );
  });

  it('fails when foreign (non-corpus, non-Chrysalis) alerts are in the window', async () => {
    // A foreign writer can no longer cover a partial restore: 94 corpus alerts
    // plus 1 foreign alert fails on both the floor and the contamination check.
    const { esClient } = clientWith({ corpus: 94, foreign: 1, chrysalis: 0 });
    await expect(assertAdDataGate({ esClient, log, ...GATE })).rejects.toThrow('foreign=1');
  });

  it('counts only the index and time window AD reads', async () => {
    const { esClient, count } = clientWith({ corpus: 95, chrysalis: 0 });
    await assertAdDataGate({ esClient, log, ...GATE });
    expect(count).toHaveBeenCalledTimes(3);
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
