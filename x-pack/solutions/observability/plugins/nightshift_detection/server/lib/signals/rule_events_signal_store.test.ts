/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { RuleEventsSignalStore } from './rule_events_signal_store';
import { getSeriesFingerprint, wrapReading } from './wrap_reading';
import { getSeriesKey } from '../strategies/series_key';
import type { DetectionSignalReading } from '../strategies/types';
import type { DetectionSignal } from '../../../common/detection_signal';

const READING: DetectionSignalReading = {
  status: 'breached',
  fingerprint: 'checkout',
  entity: { type: 'service', name: 'checkout' },
  bucket_start: 60_000,
  bucket_end: 120_000,
  value: 4.2,
  unit: 'percent',
  title: 'Errors up',
  description: 'More errors than usual',
  importance: 60,
  evidence_esql: 'FROM logs-*',
  role: 'primary',
  compare_with_normal: true,
  details: {},
};

function createSignal(reading: DetectionSignalReading = READING): DetectionSignal {
  const result = wrapReading({
    reading,
    strategyId: 'error_rate',
    strategyVersion: 1,
    spaceId: 'default',
    scheduledMinute: 120_000,
  });
  if (result.dropped) {
    throw new Error(result.note);
  }
  return result.signal;
}

function searchResponse(signals: DetectionSignal[]) {
  return {
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: signals.length, relation: 'eq' as const },
      hits: signals.map((signal) => ({ _index: '.rule-events', _source: signal })),
    },
  };
}

function createStore({ requestSpaceId = 'default' }: { requestSpaceId?: string } = {}) {
  const createSignalEvent = jest.fn();
  const spaces = {
    spacesService: { getSpaceId: jest.fn().mockReturnValue(requestSpaceId) },
  } as unknown as SpacesPluginStart;
  const alerting = {
    getAlertEventsClientWithRequest: jest.fn().mockResolvedValue({ createSignalEvent }),
  } as unknown as AlertingServerStart;
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const store = new RuleEventsSignalStore(
    httpServerMock.createKibanaRequest(),
    alerting,
    spaces,
    esClient,
    logger
  );

  return { store, createSignalEvent, alerting, esClient, logger };
}

describe('RuleEventsSignalStore', () => {
  describe('write', () => {
    it('writes each signal in the series of its strategy and reports the ones that fail', async () => {
      const { store, createSignalEvent } = createStore();
      const good = createSignal();
      const bad = createSignal({ ...READING, fingerprint: 'cart' });
      createSignalEvent.mockImplementation(async ({ fingerprint }) => {
        if (fingerprint === getSeriesFingerprint({ strategy: 'error_rate', fingerprint: 'cart' })) {
          throw new Error('invalid signal');
        }
        return { group_hash: good.group_hash };
      });

      const result = await store.write([good, bad]);

      expect(createSignalEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          source: good.source,
          fingerprint: getSeriesFingerprint({ strategy: 'error_rate', fingerprint: 'checkout' }),
          status: 'breached',
          timestamp: good.scheduled_timestamp,
        })
      );
      expect(result).toEqual({
        written: 1,
        failures: [{ fingerprint: 'cart', reason: 'invalid signal' }],
      });
    });

    it('refuses a batch with a signal of another space before writing anything', async () => {
      const { store, createSignalEvent } = createStore({ requestSpaceId: 'other' });

      const result = await store.write([
        createSignal(),
        createSignal({ ...READING, fingerprint: 'cart' }),
      ]);

      expect(createSignalEvent).not.toHaveBeenCalled();
      expect(result.written).toBe(0);
      expect(result.failures).toHaveLength(2);
    });

    it('reports every signal as failed when the Alerting v2 client cannot be created', async () => {
      const { store, alerting } = createStore();
      jest
        .mocked(alerting.getAlertEventsClientWithRequest)
        .mockRejectedValue(new Error('alerting unavailable'));

      const result = await store.write([createSignal()]);

      expect(result).toEqual({
        written: 0,
        failures: [
          { fingerprint: 'checkout', reason: 'could not reach Alerting v2: alerting unavailable' },
        ],
      });
    });

    it('fails a signal that Alerting stored in another series than the one it was wrapped for', async () => {
      const { store, createSignalEvent } = createStore();
      createSignalEvent.mockResolvedValue({ group_hash: 'another-space-hash' });

      const result = await store.write([createSignal()]);

      expect(result.written).toBe(0);
      expect(result.failures).toEqual([
        { fingerprint: 'checkout', reason: expect.stringContaining('not in the space') },
      ]);
    });
  });

  describe('readHistory', () => {
    it('counts a signal written twice once and returns each series oldest first', async () => {
      const { store, esClient } = createStore();
      const first = createSignal({ ...READING, bucket_start: 60_000, value: 1 });
      const second = createSignal({
        ...READING,
        bucket_start: 120_000,
        bucket_end: 180_000,
        value: 2,
      });
      // The search is newest first; the second window was also written a second time.
      esClient.search.mockResolvedValue(searchResponse([second, second, first]));

      const history = await store.readHistory({
        spaceId: 'default',
        strategy: 'error_rate',
        strategyVersion: 1,
        series: [{ fingerprint: 'checkout' }],
        from: 0,
        to: 180_000,
      });

      expect(
        history.get(getSeriesKey({ fingerprint: 'checkout' }))?.map(({ value }) => value)
      ).toEqual([1, 2]);
    });

    it('keeps two sources that report the same fingerprint in separate series', async () => {
      const { store, esClient } = createStore();
      const fromA = createSignal({ ...READING, source_id: 'source-a', value: 1 });
      const fromB = createSignal({ ...READING, source_id: 'source-b', value: 2 });
      esClient.search.mockResolvedValue(searchResponse([fromB, fromA]));

      const history = await store.readHistory({
        spaceId: 'default',
        strategy: 'error_rate',
        strategyVersion: 1,
        series: [
          { fingerprint: 'checkout', source_id: 'source-a' },
          { fingerprint: 'checkout', source_id: 'source-b' },
        ],
        from: 0,
        to: 180_000,
      });

      expect(history.size).toBe(2);
      expect(
        history
          .get(getSeriesKey({ fingerprint: 'checkout', source_id: 'source-a' }))
          ?.map(({ value }) => value)
      ).toEqual([1]);
      expect(
        history
          .get(getSeriesKey({ fingerprint: 'checkout', source_id: 'source-b' }))
          ?.map(({ value }) => value)
      ).toEqual([2]);
    });

    it('skips a stored document that does not parse instead of failing the read', async () => {
      const { store, esClient, logger } = createStore();
      esClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 2, relation: 'eq' },
          hits: [
            { _index: '.rule-events', _source: { type: 'signal' } },
            { _index: '.rule-events', _source: createSignal() },
          ],
        },
      });

      const history = await store.readHistory({
        spaceId: 'default',
        strategy: 'error_rate',
        strategyVersion: 1,
        series: [{ fingerprint: 'checkout' }],
        from: 0,
        to: 180_000,
      });

      expect(history.get(getSeriesKey({ fingerprint: 'checkout' }))).toHaveLength(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 stored signals'));
    });
  });
});
