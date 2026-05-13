/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DROP_WARNING_RATIO, DROP_CRITICAL_RATIO } from '@kbn/siem-readiness-common';
import type { PipelineVolumeStats, DropSeverity } from '@kbn/siem-readiness-common';

interface IndexDailyBucket {
  date: string;
  docCount: number;
}

interface IndexVolumeRaw {
  indexName: string;
  buckets: IndexDailyBucket[];
  /** Epoch ms of the most recent document in this index. Null when unavailable. */
  lastEventMs: number | null;
  /** p95 ingestion latency in ms (event.ingested − event.created / @timestamp). Null when unavailable. */
  latencyP95Ms: number | null;
}

/**
 * Painless script that computes ingestion latency in milliseconds for a single document:
 *   event.ingested − event.created   (primary)
 *   event.ingested − @timestamp      (fallback when event.created is absent)
 * Returns null when the fields are missing or the result would be negative.
 */
const LATENCY_SCRIPT = `
  long ingested = -1;
  if (doc.containsKey('event.ingested') && !doc['event.ingested'].empty) {
    ingested = doc['event.ingested'].value.toInstant().toEpochMilli();
  }
  if (ingested < 0) return null;

  long source = -1;
  if (doc.containsKey('event.created') && !doc['event.created'].empty) {
    source = doc['event.created'].value.toInstant().toEpochMilli();
  } else if (doc.containsKey('@timestamp') && !doc['@timestamp'].empty) {
    source = doc['@timestamp'].value.toInstant().toEpochMilli();
  }
  if (source < 0 || ingested < source) return null;
  return ingested - source;
`.trim();

/**
 * Fetches a 7-day daily doc-count trend, max(@timestamp), and p95 ingestion latency
 * for the given indices via a single aggregation request.
 */
const fetchIndexDailyBuckets = async (
  esClient: ElasticsearchClient,
  indexNames: string[]
): Promise<IndexVolumeRaw[]> => {
  if (indexNames.length === 0) return [];

  let searchResponse;
  try {
    searchResponse = await esClient.search({
      index: indexNames.join(','),
      size: 0,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        range: {
          '@timestamp': {
            gte: 'now-7d/d',
            lte: 'now/d',
          },
        },
      },
      aggs: {
        by_index: {
          terms: {
            field: '_index',
            size: 2000,
          },
          aggs: {
            by_day: {
              date_histogram: {
                field: '@timestamp',
                calendar_interval: '1d' as const,
                min_doc_count: 0,
                extended_bounds: {
                  min: 'now-7d/d',
                  max: 'now/d',
                },
              },
            },
            last_event: {
              max: { field: '@timestamp' },
            },
            latency_p95: {
              percentiles: {
                percents: [95],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                script: { source: LATENCY_SCRIPT, lang: 'painless' } as any,
              },
            },
          },
        },
      },
    });
  } catch {
    return [];
  }

  interface ByIndexBucket {
    key: string;
    by_day?: { buckets: Array<{ key_as_string: string; doc_count: number }> };
    last_event?: { value: number | null };
    latency_p95?: { values: { '95.0'?: number | null } };
  }

  const byIndex =
    (searchResponse.aggregations as { by_index?: { buckets: ByIndexBucket[] } })?.by_index
      ?.buckets ?? [];

  return byIndex.map((bucket) => ({
    indexName: bucket.key,
    buckets: (bucket.by_day?.buckets ?? []).map((b) => ({
      date: b.key_as_string,
      docCount: b.doc_count,
    })),
    lastEventMs: bucket.last_event?.value ?? null,
    latencyP95Ms: bucket.latency_p95?.values?.['95.0'] ?? null,
  }));
};

// ── Silence helpers ───────────────────────────────────────────────────────────

/**
 * Estimates the critical silence threshold in hours for a pipeline.
 *
 * Logic: inter-event interval ≈ 24h / baseline.
 * Critical when elapsed > 2× that interval, clamped between 1h and 48h.
 */
const criticalSilenceThresholdHours = (baseline: number): number => {
  if (baseline <= 0) return 48;
  const interEventHours = 24 / baseline;
  return Math.min(48, Math.max(1, interEventHours * 2));
};

// ── Core computation ──────────────────────────────────────────────────────────

/**
 * Computes PipelineVolumeStats for a set of indices that belong to one pipeline.
 * All indices are treated as one logical unit; their daily counts are summed.
 *
 * @param indexBuckets  - Pre-fetched per-index data (from fetchIndexDailyBuckets)
 * @param pipelineIndices - The subset of indices belonging to this pipeline
 */
export const computePipelineVolumeStats = (
  indexBuckets: IndexVolumeRaw[],
  pipelineIndices: string[]
): PipelineVolumeStats => {
  const empty: PipelineVolumeStats = {
    current24h: 0,
    baseline: null,
    lastEventMs: null,
    hoursSilent: null,
    silenceDetected: false,
    criticalSilence: false,
    dropPercent: null,
    dropSeverity: 'none',
    latencyP95Ms: null,
  };

  if (pipelineIndices.length === 0) return empty;

  const pipelineIndexSet = new Set(pipelineIndices);
  const relevantBuckets = indexBuckets.filter((b) => pipelineIndexSet.has(b.indexName));
  if (relevantBuckets.length === 0) return empty;

  // ── Daily volume ──────────────────────────────────────────────────────────
  const dailyMap = new Map<string, number>();
  for (const idx of relevantBuckets) {
    for (const bucket of idx.buckets) {
      dailyMap.set(bucket.date, (dailyMap.get(bucket.date) ?? 0) + bucket.docCount);
    }
  }

  const sorted = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  if (sorted.length === 0) return empty;

  const current24h = sorted[sorted.length - 1][1];
  const totalDocs = sorted.reduce((sum, [, count]) => sum + count, 0);
  const daysWithData = sorted.filter(([, count]) => count > 0);
  const baseline = daysWithData.length > 0 ? Math.round(totalDocs / daysWithData.length) : null;

  // ── Silence ───────────────────────────────────────────────────────────────
  const lastEventMs = relevantBuckets.reduce<number | null>((max, b) => {
    if (b.lastEventMs === null) return max;
    return max === null ? b.lastEventMs : Math.max(max, b.lastEventMs);
  }, null);

  const nowMs = Date.now();
  const hoursSilent = lastEventMs !== null ? (nowMs - lastEventMs) / (1000 * 60 * 60) : null;
  const silenceDetected = current24h === 0 && baseline !== null && baseline > 0;
  const criticalSilence =
    hoursSilent !== null && baseline !== null
      ? hoursSilent > criticalSilenceThresholdHours(baseline)
      : silenceDetected;

  // ── Volume drop ───────────────────────────────────────────────────────────
  const dropPercent =
    baseline !== null && baseline > 0
      ? Math.round(((baseline - current24h) / baseline) * 100)
      : null;

  let dropSeverity: DropSeverity = 'none';
  if (dropPercent !== null) {
    if (dropPercent / 100 >= DROP_CRITICAL_RATIO) dropSeverity = 'critical';
    else if (dropPercent / 100 >= DROP_WARNING_RATIO) dropSeverity = 'warning';
  }

  // ── Latency ───────────────────────────────────────────────────────────────
  // Use the maximum p95 across all indices (conservative: worst offender)
  const latencyP95Ms = relevantBuckets.reduce<number | null>((max, b) => {
    if (b.latencyP95Ms === null) return max;
    return max === null ? b.latencyP95Ms : Math.max(max, b.latencyP95Ms);
  }, null);

  return {
    current24h,
    baseline,
    lastEventMs,
    hoursSilent,
    silenceDetected,
    criticalSilence,
    dropPercent,
    dropSeverity,
    latencyP95Ms,
  };
};

/**
 * Fetches volume stats (7-day trend + latency) for all indices in pipelineToIndices
 * and returns a map from pipeline name to its computed PipelineVolumeStats.
 *
 * A single ES search request is issued regardless of how many pipelines or indices exist.
 */
export const fetchPipelineVolumeStats = async (
  esClient: ElasticsearchClient,
  pipelineToIndices: Record<string, string[]>
): Promise<Record<string, PipelineVolumeStats>> => {
  const allIndices = [...new Set(Object.values(pipelineToIndices).flat())];
  const indexBuckets = await fetchIndexDailyBuckets(esClient, allIndices);

  const result: Record<string, PipelineVolumeStats> = {};
  for (const [pipelineName, indices] of Object.entries(pipelineToIndices)) {
    result[pipelineName] = computePipelineVolumeStats(indexBuckets, indices);
  }
  return result;
};
