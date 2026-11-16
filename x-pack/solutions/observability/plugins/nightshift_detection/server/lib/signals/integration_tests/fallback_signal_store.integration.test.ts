/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import {
  DETECTION_SIGNALS_FALLBACK_STREAM,
  type DetectionSignal,
} from '../../../../common/detection_signal';
import type { DetectionSignalReading } from '../../strategies/types';
import { FallbackSignalStore } from '../fallback_signal_store';
import { wrapReading } from '../wrap_reading';

const MINUTE_MS = 60_000;
const WINDOW_START = Date.UTC(2026, 10, 13, 10, 0);

function createReading({
  fingerprint,
  minute,
  status = 'breached',
  value,
}: {
  fingerprint: string;
  minute: number;
  status?: DetectionSignalReading['status'];
  value: number;
}): DetectionSignalReading {
  return {
    status,
    fingerprint,
    entity: { type: 'service', name: fingerprint },
    bucket_start: WINDOW_START + minute * MINUTE_MS,
    bucket_end: WINDOW_START + (minute + 1) * MINUTE_MS,
    value,
    unit: 'count',
    title: 'Errors up',
    description: 'More errors than usual',
    importance: 50,
    evidence_esql: 'FROM logs-*',
    role: 'primary',
    compare_with_normal: true,
    details: {},
  };
}

function wrapAll(
  readings: DetectionSignalReading[],
  { spaceId = 'default', strategyId = 'error_rate' } = {}
): DetectionSignal[] {
  return readings.map((reading) => {
    const result = wrapReading({
      reading,
      strategyId,
      strategyVersion: 1,
      spaceId,
      scheduledMinute: reading.bucket_end,
    });
    if (result.dropped) {
      throw new Error(result.note);
    }
    return result.signal;
  });
}

// Runs as the test cluster's superuser: the kibana_system grant on the engine's indices is a
// separate Elasticsearch change, so this test does not cover it.
describe('FallbackSignalStore', () => {
  jest.setTimeout(10 * 60 * 1000);

  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let store: FallbackSignalStore;

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    esServer = await startES();
    esClient = esServer.es.getClient();
    store = new FallbackSignalStore(esClient, loggingSystemMock.createLogger());
  });

  afterAll(async () => {
    // Teardown only: a failure to stop must not hide the test result.
    await esServer?.stop().catch(() => {});
  });

  it('writes breached and recovered signals once, stamping the time on the way in', async () => {
    const signals = wrapAll([
      createReading({ fingerprint: 'stamped', minute: 0, status: 'breached', value: 5 }),
      createReading({ fingerprint: 'stamped', minute: 1, status: 'recovered', value: 0 }),
    ]);
    const result = await store.write(signals);
    // A window read again after a crash writes the same signals; they must not be stored twice.
    const rewrite = await store.write(signals);
    await esClient.indices.refresh({ index: DETECTION_SIGNALS_FALLBACK_STREAM });

    const stored = await esClient.search<{ '@timestamp'?: string; status: string }>({
      index: DETECTION_SIGNALS_FALLBACK_STREAM,
      query: { term: { 'data.fingerprint': 'stamped' } },
    });

    expect(result).toEqual({ written: 2, failures: [] });
    expect(rewrite).toEqual({ written: 2, failures: [] });
    expect(stored.hits.hits).toHaveLength(2);
    expect(stored.hits.hits.map(({ _source }) => _source?.status).sort()).toEqual([
      'breached',
      'recovered',
    ]);
    expect(stored.hits.hits.every(({ _source }) => Boolean(_source?.['@timestamp']))).toBe(true);
  });

  it('reads the history of two series inside a window, by bucket start and with the value', async () => {
    await store.write(
      wrapAll([
        createReading({ fingerprint: 'history-a', minute: 0, value: 1.5 }),
        createReading({ fingerprint: 'history-a', minute: 1, value: 2.5 }),
        // Starts at the end of the window, so it is out: the window is [from, to).
        createReading({ fingerprint: 'history-a', minute: 2, value: 9 }),
        createReading({ fingerprint: 'history-b', minute: 1, value: 7 }),
        // Starts before the window.
        createReading({ fingerprint: 'history-b', minute: -1, value: 8 }),
      ])
    );
    // Same series, but another space and another strategy: neither may show up.
    await store.write(
      wrapAll([createReading({ fingerprint: 'history-a', minute: 0, value: 100 })], {
        spaceId: 'other',
      })
    );
    await store.write(
      wrapAll([createReading({ fingerprint: 'history-a', minute: 0, value: 200 })], {
        strategyId: 'latency',
      })
    );
    await esClient.indices.refresh({ index: DETECTION_SIGNALS_FALLBACK_STREAM });

    const history = await store.readHistory({
      spaceId: 'default',
      strategy: 'error_rate',
      fingerprints: ['history-a', 'history-b', 'history-missing'],
      from: WINDOW_START,
      to: WINDOW_START + 2 * MINUTE_MS,
    });

    expect([...history.keys()].sort()).toEqual(['history-a', 'history-b']);
    expect(history.get('history-a')?.map(({ value }) => value)).toEqual([1.5, 2.5]);
    expect(history.get('history-b')?.map(({ value }) => value)).toEqual([7]);
  });
});
