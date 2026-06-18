/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { SILENCE_BOOTSTRAP_DAYS } from '@kbn/siem-readiness';
import { toDataStreamName } from './utils';

export interface IndexHealthEntry {
  lastEventMs: number | null;
  /** Date.now() − lastEventMs; null when the stream has never received events. */
  silenceMs: number | null;
  /**
   * Doc count for yesterday (the most recent complete UTC day). The in-progress
   * current day is excluded so a partial day is never compared against full-day
   * baselines. null when the stream is younger than SILENCE_BOOTSTRAP_DAYS
   * (insufficient history).
   */
  lastFullDayDocs: number | null;
  baseline7dAvg: number | null;
  /** Clamped to [0, ∞) — null when baseline unavailable or zero. */
  volumeDropPct: number | null;
}

interface DataStreamsStatsResponseShape {
  data_streams?: Array<{ data_stream: string; maximum_timestamp?: number | null }>;
}

interface DataStreamMetaResponseShape {
  data_streams?: Array<{ name: string; creation_date?: number }>;
}

interface VolumeAggregationShape {
  by_index?: {
    buckets: Array<{ key: string; daily?: { buckets: Array<{ doc_count: number }> } }>;
  };
}

/**
 * Fetch last-event time and volume health for all SIEM data streams.
 *
 * - `lastEventMs` comes from `_data_stream/_stats.maximum_timestamp`, which is
 *   pre-computed by Elasticsearch and requires no query-time aggregation (aligned
 *   with the Dataset Quality data source).
 * - Volume fields (`lastFullDayDocs`, `baseline7dAvg`, `volumeDropPct`) are
 *   computed from a single date-histogram search over the past 8 days. We compare
 *   yesterday's complete day against the prior full days' average; the in-progress
 *   current day is dropped so a partial day never triggers a false volume drop.
 * - Young streams (creation_date within SILENCE_BOOTSTRAP_DAYS) get null volume
 *   fields — the baseline cannot be trusted yet.
 *
 * Results are keyed by data stream name.
 */
export const fetchIndexHealth = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<Record<string, IndexHealthEntry>> => {
  const now = Date.now();
  const bootstrapCutoff = now - SILENCE_BOOTSTRAP_DAYS * 24 * 60 * 60 * 1000;

  const [statsResponse, dataStreamResponse, volumeResponse] = await Promise.all([
    // 1. Pre-computed maximum_timestamp per data stream (cheap — no query-time scan)
    esClient.indices.dataStreamsStats({ name: ['logs-*', 'metrics-*'] }),

    // 2. Data stream metadata — used to guard young streams by creation_date
    esClient.indices.getDataStream({
      name: ['logs-*', 'metrics-*'],
      filter_path: ['data_streams.name', 'data_streams.creation_date'],
    }),

    // 3. Daily doc-count histogram for volume trend. Range is rounded to UTC
    //    midnight (`now-8d/d`) so the first bucket is a full day; this yields 8
    //    complete prior days plus the in-progress current day (dropped below).
    esClient.search({
      index: ['logs-*', 'metrics-*'],
      size: 0,
      query: { range: { '@timestamp': { gte: 'now-8d/d' } } },
      aggs: {
        by_index: {
          terms: { field: '_index', size: 1000 },
          aggs: {
            daily: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: '1d',
                min_doc_count: 0,
                extended_bounds: { min: 'now-8d/d', max: 'now' },
              },
            },
          },
        },
      },
    }),
  ]);

  // Build creation date map: dataStreamName → creationDateMs
  const creationDateByStream = new Map<string, number>();
  for (const ds of (dataStreamResponse as unknown as DataStreamMetaResponseShape).data_streams ??
    []) {
    if (ds.creation_date != null) {
      creationDateByStream.set(ds.name, ds.creation_date);
    }
  }

  // Build lastEventMs map: dataStreamName → epoch ms (from pre-computed maximum_timestamp)
  const lastEventByStream = new Map<string, number | null>();
  for (const ds of (statsResponse as unknown as DataStreamsStatsResponseShape).data_streams ?? []) {
    lastEventByStream.set(ds.data_stream, ds.maximum_timestamp ?? null);
  }

  // Aggregate volume buckets by data stream name
  const volumeByStream = new Map<string, { lastFullDayDocs: number; baseline7dAvg: number }>();
  const histBuckets =
    (volumeResponse.aggregations as unknown as VolumeAggregationShape | undefined)?.by_index
      ?.buckets ?? [];

  for (const bucket of histBuckets) {
    const streamName = toDataStreamName(bucket.key);
    const dailyBuckets = bucket.daily?.buckets ?? [];
    // Drop the last bucket — it is the in-progress current day (partial). Compare
    // yesterday (the most recent complete day) against the prior full days' average.
    const completeDays = dailyBuckets.slice(0, -1);
    if (completeDays.length >= 2) {
      const lastFullDayDocs = completeDays[completeDays.length - 1].doc_count;
      const priorDays = completeDays.slice(0, -1).map((b) => b.doc_count);
      const baseline7dAvg = priorDays.reduce((sum, n) => sum + n, 0) / priorDays.length;

      const existing = volumeByStream.get(streamName);
      if (existing) {
        volumeByStream.set(streamName, {
          lastFullDayDocs: existing.lastFullDayDocs + lastFullDayDocs,
          baseline7dAvg: existing.baseline7dAvg + baseline7dAvg,
        });
      } else {
        volumeByStream.set(streamName, { lastFullDayDocs, baseline7dAvg });
      }
    }
  }

  // Build final result keyed by data stream name
  const result: Record<string, IndexHealthEntry> = {};

  for (const [streamName, lastEventMs] of lastEventByStream.entries()) {
    const silenceMs = lastEventMs !== null ? now - lastEventMs : null;
    const creationDate = creationDateByStream.get(streamName) ?? 0;
    const isYoung = creationDate > bootstrapCutoff;

    let lastFullDayDocs: number | null = null;
    let baseline7dAvg: number | null = null;
    let volumeDropPct: number | null = null;

    if (!isYoung) {
      const vol = volumeByStream.get(streamName);
      if (vol !== undefined) {
        lastFullDayDocs = vol.lastFullDayDocs;
        baseline7dAvg = vol.baseline7dAvg;
        volumeDropPct =
          baseline7dAvg === 0
            ? null
            : Math.max(0, Math.round(((baseline7dAvg - lastFullDayDocs) / baseline7dAvg) * 100));
      }
    }

    result[streamName] = {
      lastEventMs,
      silenceMs,
      lastFullDayDocs,
      baseline7dAvg,
      volumeDropPct,
    };
  }

  return result;
};
