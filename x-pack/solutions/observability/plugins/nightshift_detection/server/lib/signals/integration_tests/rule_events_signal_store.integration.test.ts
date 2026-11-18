/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import { ALERT_EVENTS_MAPPINGS } from '@kbn/alerting-v2-schemas';
import type { ElasticsearchClient } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { DetectionSignal } from '../../../../common/detection_signal';
import { getSeriesKey } from '../../strategies/series_key';
import type { DetectionSignalReading } from '../../strategies/types';
import { RuleEventsSignalStore } from '../rule_events_signal_store';
import { wrapReading } from '../wrap_reading';

const MINUTE_MS = 60_000;
const WINDOW_START = Date.UTC(2026, 10, 13, 10, 0);

function createSignal({
  fingerprint,
  minute,
  value,
  spaceId = 'default',
  strategyId = 'error_rate',
  strategyVersion = 1,
}: {
  fingerprint: string;
  minute: number;
  value: number;
  spaceId?: string;
  strategyId?: string;
  strategyVersion?: number;
}): DetectionSignal {
  const reading: DetectionSignalReading = {
    status: 'breached',
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
  const result = wrapReading({
    reading,
    strategyId,
    strategyVersion,
    spaceId,
    scheduledMinute: reading.bucket_end,
  });
  if (result.dropped) {
    throw new Error(result.note);
  }
  return result.signal;
}

// Runs as the test cluster's superuser, and seeds `.rule-events` with the documents that
// `createSignalEvent` stores. It proves the read against the real mapping; the write goes through
// Alerting v2 and is covered there.
describe('RuleEventsSignalStore reading from .rule-events', () => {
  jest.setTimeout(10 * 60 * 1000);

  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let store: RuleEventsSignalStore;

  const seed = async (signals: DetectionSignal[]) => {
    await esClient.bulk({
      operations: signals.flatMap((signal) => [
        { create: { _index: ALERT_EVENTS_DATA_STREAM } },
        { '@timestamp': signal.scheduled_timestamp, ...signal },
      ]),
    });
    await esClient.indices.refresh({ index: ALERT_EVENTS_DATA_STREAM });
  };

  const read = async ({ strategyVersion = 1 }: { strategyVersion?: number } = {}) =>
    store.readHistory({
      spaceId: 'default',
      strategy: 'error_rate',
      strategyVersion,
      series: ['history-a', 'history-b', 'history-missing'].map((fingerprint) => ({ fingerprint })),
      from: WINDOW_START,
      to: WINDOW_START + 2 * MINUTE_MS,
    });

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    esServer = await startES();
    esClient = esServer.es.getClient();
    await esClient.indices.putIndexTemplate({
      name: ALERT_EVENTS_DATA_STREAM,
      index_patterns: [ALERT_EVENTS_DATA_STREAM],
      data_stream: { hidden: true },
      template: { mappings: ALERT_EVENTS_MAPPINGS },
    });
    await esClient.indices.createDataStream({ name: ALERT_EVENTS_DATA_STREAM });
    store = new RuleEventsSignalStore(
      httpServerMock.createKibanaRequest(),
      {} as AlertingServerStart,
      {} as SpacesPluginStart,
      esClient,
      loggingSystemMock.createLogger()
    );
  });

  afterAll(async () => {
    // Teardown only: a failure to stop must not hide the test result.
    await esServer?.stop().catch(() => {});
  });

  it('reads two series inside a window by bucket start, leaving out other spaces, strategies and versions', async () => {
    await seed([
      createSignal({ fingerprint: 'history-a', minute: 0, value: 1.5 }),
      createSignal({ fingerprint: 'history-a', minute: 1, value: 2.5 }),
      // Starts at the end of the window, so it is out: the window is [from, to).
      createSignal({ fingerprint: 'history-a', minute: 2, value: 9 }),
      createSignal({ fingerprint: 'history-b', minute: 1, value: 7 }),
      // Starts before the window.
      createSignal({ fingerprint: 'history-b', minute: -1, value: 8 }),
      createSignal({ fingerprint: 'history-a', minute: 0, value: 100, spaceId: 'other' }),
      createSignal({ fingerprint: 'history-a', minute: 0, value: 200, strategyId: 'latency' }),
      createSignal({ fingerprint: 'history-a', minute: 0, value: 300, strategyVersion: 2 }),
    ]);

    const history = await read();

    const seriesA = getSeriesKey({ fingerprint: 'history-a' });
    const seriesB = getSeriesKey({ fingerprint: 'history-b' });
    expect([...history.keys()].sort()).toEqual([seriesA, seriesB].sort());
    expect(history.get(seriesA)?.map(({ value }) => value)).toEqual([1.5, 2.5]);
    expect(history.get(seriesB)?.map(({ value }) => value)).toEqual([7]);
    expect((await read({ strategyVersion: 2 })).get(seriesA)?.map(({ value }) => value)).toEqual([
      300,
    ]);
  });

  it('returns a signal written twice once', async () => {
    const signal = createSignal({ fingerprint: 'twice', minute: 0, value: 4 });
    await seed([signal, signal]);

    const history = await store.readHistory({
      spaceId: 'default',
      strategy: 'error_rate',
      strategyVersion: 1,
      series: [{ fingerprint: 'twice' }],
      from: WINDOW_START,
      to: WINDOW_START + MINUTE_MS,
    });

    expect(history.get(getSeriesKey({ fingerprint: 'twice' }))).toHaveLength(1);
  });
});
