/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { SILENCE_BOOTSTRAP_DAYS } from '@kbn/siem-readiness';
import { fetchIndexHealth } from './fetch_index_health';

const NOW = 1_700_000_000_000; // fixed epoch ms
const BOOTSTRAP_CUTOFF = NOW - SILENCE_BOOTSTRAP_DAYS * 24 * 60 * 60 * 1000;

const makeDailyBuckets = (counts: number[]) => counts.map((doc_count) => ({ doc_count }));

const makeEsClient = ({
  streams = [] as Array<{ name: string; maximum_timestamp?: number | null }>,
  creationDates = {} as Record<string, number>,
  histBuckets = [] as Array<{ key: string; daily: { buckets: Array<{ doc_count: number }> } }>,
} = {}): ElasticsearchClient =>
  ({
    indices: {
      dataStreamsStats: jest.fn().mockResolvedValue({
        data_streams: streams.map((s) => ({
          data_stream: s.name,
          maximum_timestamp: s.maximum_timestamp ?? null,
        })),
      }),
      getDataStream: jest.fn().mockResolvedValue({
        data_streams: Object.entries(creationDates).map(([name, creation_date]) => ({
          name,
          creation_date,
        })),
      }),
    },
    search: jest.fn().mockResolvedValue({
      aggregations: {
        by_index: { buckets: histBuckets },
      },
    }),
  } as unknown as ElasticsearchClient);

describe('fetchIndexHealth', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('lastEventMs and silenceMs from maximum_timestamp', () => {
    it('reads lastEventMs from _data_stream/_stats maximum_timestamp', async () => {
      const lastEventMs = NOW - 10 * 60 * 1000; // 10 min ago
      const esClient = makeEsClient({
        streams: [{ name: 'logs-endpoint.events-default', maximum_timestamp: lastEventMs }],
        creationDates: { 'logs-endpoint.events-default': BOOTSTRAP_CUTOFF - 1 },
      });

      const result = await fetchIndexHealth({ esClient });
      expect(result['logs-endpoint.events-default'].lastEventMs).toBe(lastEventMs);
      expect(result['logs-endpoint.events-default'].silenceMs).toBe(NOW - lastEventMs);
    });

    it('returns null lastEventMs and silenceMs when maximum_timestamp is null', async () => {
      const esClient = makeEsClient({
        streams: [{ name: 'logs-new.stream-default', maximum_timestamp: null }],
        creationDates: { 'logs-new.stream-default': BOOTSTRAP_CUTOFF - 1 },
      });

      const result = await fetchIndexHealth({ esClient });
      expect(result['logs-new.stream-default'].lastEventMs).toBeNull();
      expect(result['logs-new.stream-default'].silenceMs).toBeNull();
    });
  });

  describe('young stream guard (creation_date within SILENCE_BOOTSTRAP_DAYS)', () => {
    it('returns null volume fields for a stream younger than SILENCE_BOOTSTRAP_DAYS', async () => {
      const youngCreationDate = NOW - (SILENCE_BOOTSTRAP_DAYS - 1) * 24 * 60 * 60 * 1000;
      const esClient = makeEsClient({
        streams: [{ name: 'logs-young-default', maximum_timestamp: NOW - 1000 }],
        creationDates: { 'logs-young-default': youngCreationDate },
        histBuckets: [
          {
            key: 'logs-young-default',
            // Last bucket is the in-progress (partial) current day and is dropped.
            daily: { buckets: makeDailyBuckets([100, 100, 100, 100, 100, 100, 100, 50, 0]) },
          },
        ],
      });

      const result = await fetchIndexHealth({ esClient });
      expect(result['logs-young-default'].lastFullDayDocs).toBeNull();
      expect(result['logs-young-default'].baseline7dAvg).toBeNull();
      expect(result['logs-young-default'].volumeDropPct).toBeNull();
    });

    it('returns volume fields for a stream older than SILENCE_BOOTSTRAP_DAYS', async () => {
      const oldCreationDate = BOOTSTRAP_CUTOFF - 1;
      const esClient = makeEsClient({
        streams: [{ name: 'logs-old-default', maximum_timestamp: NOW - 1000 }],
        creationDates: { 'logs-old-default': oldCreationDate },
        histBuckets: [
          {
            key: 'logs-old-default',
            // Trailing 0 is the in-progress current day (dropped); 10 is yesterday.
            daily: { buckets: makeDailyBuckets([100, 100, 100, 100, 100, 100, 100, 10, 0]) },
          },
        ],
      });

      const result = await fetchIndexHealth({ esClient });
      expect(result['logs-old-default'].lastFullDayDocs).toBe(10);
      expect(result['logs-old-default'].baseline7dAvg).toBe(100);
    });
  });

  describe('volumeDropPct calculation', () => {
    it('computes 90% drop correctly', async () => {
      const esClient = makeEsClient({
        streams: [{ name: 'logs-drop-default', maximum_timestamp: NOW - 1000 }],
        creationDates: { 'logs-drop-default': BOOTSTRAP_CUTOFF - 1 },
        histBuckets: [
          {
            key: 'logs-drop-default',
            daily: { buckets: makeDailyBuckets([100, 100, 100, 100, 100, 100, 100, 10, 0]) },
          },
        ],
      });

      const result = await fetchIndexHealth({ esClient });
      expect(result['logs-drop-default'].volumeDropPct).toBe(90);
    });

    it('clamps volumeDropPct to 0 on a volume spike', async () => {
      const esClient = makeEsClient({
        streams: [{ name: 'logs-spike-default', maximum_timestamp: NOW - 1000 }],
        creationDates: { 'logs-spike-default': BOOTSTRAP_CUTOFF - 1 },
        histBuckets: [
          {
            key: 'logs-spike-default',
            daily: { buckets: makeDailyBuckets([100, 100, 100, 100, 100, 100, 100, 500, 0]) },
          },
        ],
      });

      const result = await fetchIndexHealth({ esClient });
      expect(result['logs-spike-default'].volumeDropPct).toBe(0);
    });

    it('returns null volumeDropPct when baseline is zero', async () => {
      const esClient = makeEsClient({
        streams: [{ name: 'logs-zero-default', maximum_timestamp: NOW - 1000 }],
        creationDates: { 'logs-zero-default': BOOTSTRAP_CUTOFF - 1 },
        histBuckets: [
          {
            key: 'logs-zero-default',
            daily: { buckets: makeDailyBuckets([0, 0, 0, 0, 0, 0, 0, 10, 0]) },
          },
        ],
      });

      const result = await fetchIndexHealth({ esClient });
      expect(result['logs-zero-default'].volumeDropPct).toBeNull();
    });
  });

  describe('backing index → data stream name resolution', () => {
    it('aggregates volume from backing index names into data stream name key', async () => {
      const backingIndex = '.ds-logs-endpoint.events-default-2024.01.15-000001';
      const streamName = 'logs-endpoint.events-default';

      const esClient = makeEsClient({
        streams: [{ name: streamName, maximum_timestamp: NOW - 1000 }],
        creationDates: { [streamName]: BOOTSTRAP_CUTOFF - 1 },
        histBuckets: [
          {
            key: backingIndex,
            daily: { buckets: makeDailyBuckets([100, 100, 100, 100, 100, 100, 100, 50, 0]) },
          },
        ],
      });

      const result = await fetchIndexHealth({ esClient });
      expect(result[streamName]).toBeDefined();
      expect(result[streamName].lastFullDayDocs).toBe(50);
      expect(result[streamName].baseline7dAvg).toBe(100);
    });
  });
});
