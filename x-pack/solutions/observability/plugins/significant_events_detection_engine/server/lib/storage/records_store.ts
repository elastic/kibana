/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  ActivityEntry,
  ActivityStep,
  DetectionOutcome,
  DetectionStrategyId,
  EngineDetection,
  EngineObservation,
  EnginePage,
  EngineRunSummary,
} from '../../../common';
import { withRetry } from '../retry';
import { decodeCursor, encodeCursor } from './cursor';
import {
  ACTIVITY_DATA_STREAM,
  DETECTIONS_DATA_STREAM,
  OBSERVATIONS_DATA_STREAM,
  RUNS_DATA_STREAM,
  type activityMappings,
  type detectionsMappings,
  type observationsMappings,
  type runsMappings,
  type StoredActivity,
  type StoredDetection,
  type StoredObservation,
  type StoredRun,
} from './data_streams';

/** Largest number of series one history read asks for; bigger asks are split. */
const HISTORY_SERIES_CHUNK = 500;
/** ES caps top hits per bucket at 100 by default (`index.max_inner_result_window`). */
const MAX_SAMPLES_PER_SERIES = 100;
const WRITE_CHUNK = 5_000;
/** The traffic series feeds the silence check and is never a detection on its own. */
const INTERNAL_SERIES_PREFIX = 'health:traffic:';

/** One past value of a series. */
export interface HistorySample {
  bucket_start: string;
  value: number;
}

/** A series to read history for, with the windows to leave out (its open incidents). */
export interface HistoryRequest {
  fingerprint: string;
  exclude: Array<{ from: string; to?: string }>;
}

/** Counts per strategy, read from what the engine recorded. */
export interface DetectionCounts {
  detections: number;
  above_normal: number;
  would_raise_in_trial: number;
}

/** The engine's append-only records of one space: observations, detections, activity, runs. */
export interface IRecordsStore {
  writeObservations(docs: Array<Omit<EngineObservation, '@timestamp'>>): Promise<void>;
  /**
   * The most recent `limit` samples of each series before `before`, newest last, leaving out
   * each series' excluded windows and anything older than `lookbackMs`.
   */
  readHistory(params: {
    series: HistoryRequest[];
    before: number;
    lookbackMs: number;
    limit: number;
  }): Promise<Map<string, HistorySample[]>>;
  /** Series a strategy evaluated since a time, with their service. */
  recentSeries(params: {
    strategy: DetectionStrategyId;
    fingerprintPrefix: string;
    since: string;
    /**
     * Only series with a value above zero in that time. Sparse series use it so a series that
     * went back to zero stops being reported once the window passes.
     */
    activeOnly?: boolean;
  }): Promise<Array<{ fingerprint: string; service: string }>>;
  writeDetections(docs: EngineDetection[]): Promise<void>;
  listDetections(params: {
    strategy?: DetectionStrategyId;
    outcome?: DetectionOutcome;
    eventId?: string;
    size: number;
    cursor?: string;
  }): Promise<EnginePage<EngineDetection>>;
  countDetections(since: string): Promise<number>;
  detectionCounts(since?: string): Promise<Partial<Record<DetectionStrategyId, DetectionCounts>>>;
  appendActivity(entries: ActivityEntry[]): Promise<void>;
  listActivity(params: {
    eventId?: string;
    step?: ActivityStep;
    runId?: string;
    size: number;
    cursor?: string;
  }): Promise<EnginePage<ActivityEntry>>;
  /** Times the verifier found an event's conclusion no longer held, per origin strategy. */
  verifierFailures(): Promise<Map<string, number>>;
  writeRun(run: EngineRunSummary): Promise<void>;
  listRuns(params: { size: number; cursor?: string }): Promise<EnginePage<EngineRunSummary>>;
  /** Series and detections per service over a recent window. */
  serviceActivity(since: string): Promise<
    Array<{
      service: string;
      strategies: Array<{ strategy: DetectionStrategyId; series: number }>;
      detections: number;
    }>
  >;
  clear(): Promise<void>;
}

function assertBulkOk(response: BulkResponse, what: string): void {
  if (!response.errors) {
    return;
  }
  // A 409 on create means the same deterministic id was already written: the write is a no-op.
  const failure = response.items.find((item) => item.create?.error && item.create.status !== 409)
    ?.create?.error;
  if (failure) {
    throw new Error(`Writing ${what} failed: ${failure.type}: ${failure.reason}`);
  }
}

/** One aggregation of a response; the caller knows its shape from the request it sent. */
function aggregation(response: { aggregations?: unknown }, name: string): unknown {
  return (response.aggregations as Record<string, unknown> | undefined)?.[name];
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  );
}

/** Creates the records store of one space, backed by the plugin's data streams. */
export function createRecordsStore({
  dataStreams,
  esClient,
  spaceId,
}: {
  dataStreams: DataStreamsStart;
  esClient: ElasticsearchClient;
  spaceId: string;
}): IRecordsStore {
  const space = spaceId;
  const observations = () =>
    dataStreams.initializeClient<typeof observationsMappings, StoredObservation>(
      OBSERVATIONS_DATA_STREAM
    );
  const detections = () =>
    dataStreams.initializeClient<typeof detectionsMappings, StoredDetection>(
      DETECTIONS_DATA_STREAM
    );
  const activity = () =>
    dataStreams.initializeClient<typeof activityMappings, StoredActivity>(ACTIVITY_DATA_STREAM);
  const runs = () => dataStreams.initializeClient<typeof runsMappings, StoredRun>(RUNS_DATA_STREAM);

  const readHistoryChunk = async ({
    series,
    before,
    lookbackMs,
    limit,
  }: {
    series: HistoryRequest[];
    before: number;
    lookbackMs: number;
    limit: number;
  }): Promise<Array<[string, HistorySample[]]>> => {
    const client = await observations();
    const range = {
      range: {
        bucket_start: {
          gte: new Date(before - lookbackMs).toISOString(),
          lt: new Date(before).toISOString(),
        },
      },
    };
    // Each series has its own excluded windows, so each gets its own filter clause; a top-hits
    // aggregation then keeps only the newest samples of each, bounding the response.
    const response = await client.search({
      space,
      size: 0,
      query: {
        bool: {
          filter: [range],
          should: series.map(({ fingerprint, exclude }) => ({
            bool: {
              filter: [{ term: { fingerprint } }],
              must_not: exclude.map((window) => ({
                range: {
                  bucket_start: { gte: window.from, ...(window.to ? { lt: window.to } : {}) },
                },
              })),
            },
          })),
          minimum_should_match: 1,
        },
      },
      aggs: {
        series: {
          terms: { field: 'fingerprint', size: series.length },
          aggs: {
            latest: {
              top_hits: {
                size: Math.min(limit, MAX_SAMPLES_PER_SERIES),
                sort: [{ bucket_start: { order: 'desc' } }],
                _source: ['bucket_start', 'value'],
              },
            },
          },
        },
      },
    });
    const buckets =
      (
        aggregation(response, 'series') as
          | {
              buckets: Array<{
                key: string;
                latest: { hits: { hits: Array<{ _source?: HistorySample }> } };
              }>;
            }
          | undefined
      )?.buckets ?? [];
    return buckets.map((bucket) => [
      bucket.key,
      bucket.latest.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : [])).reverse(),
    ]);
  };

  return {
    async writeObservations(docs) {
      if (docs.length === 0) {
        return;
      }
      const client = await observations();
      for (const batch of chunk(docs, WRITE_CHUNK)) {
        // Sequential batches keep a long catch-up from sending one huge bulk request.
        const response = await withRetry(() =>
          client.create({
            space,
            documents: batch.map((doc) => ({
              // Deterministic: evaluating a bucket twice never adds a second sample.
              _id: `${doc.fingerprint}@${doc.bucket_start}`,
              '@timestamp': doc.bucket_start,
              ...doc,
            })),
          })
        );
        assertBulkOk(response, 'observations');
      }
    },

    async readHistory({ series, before, lookbackMs, limit }) {
      if (series.length === 0) {
        return new Map();
      }
      const results = await Promise.all(
        chunk(series, HISTORY_SERIES_CHUNK).map((part) =>
          readHistoryChunk({ series: part, before, lookbackMs, limit })
        )
      );
      return new Map(results.flat());
    },

    async recentSeries({ strategy, fingerprintPrefix, since, activeOnly = false }) {
      const client = await observations();
      const response = await client.search({
        space,
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { strategy } },
              { prefix: { fingerprint: fingerprintPrefix } },
              { range: { bucket_start: { gte: since } } },
              ...(activeOnly ? [{ range: { value: { gt: 0 } } }] : []),
            ],
          },
        },
        aggs: {
          series: {
            terms: { field: 'fingerprint', size: 10_000 },
            aggs: { service: { terms: { field: 'service', size: 1 } } },
          },
        },
      });
      const buckets =
        (
          aggregation(response, 'series') as
            | { buckets: Array<{ key: string; service: { buckets: Array<{ key: string }> } }> }
            | undefined
        )?.buckets ?? [];
      return buckets.map((bucket) => ({
        fingerprint: bucket.key,
        service: bucket.service.buckets[0]?.key ?? 'unknown',
      }));
    },

    async writeDetections(docs) {
      if (docs.length === 0) {
        return;
      }
      const client = await detections();
      for (const batch of chunk(docs, WRITE_CHUNK)) {
        // Sequential for the same reason as observations.
        const response = await withRetry(() =>
          client.create({
            space,
            documents: batch.map((doc) => ({ _id: doc.detection_id, ...doc })),
          })
        );
        assertBulkOk(response, 'detections');
      }
    },

    async listDetections({ strategy, outcome, eventId, size, cursor }) {
      const client = await detections();
      const filter: estypes.QueryDslQueryContainer[] = [];
      if (strategy) {
        filter.push({ term: { strategy } });
      }
      if (outcome) {
        filter.push({ term: { outcome } });
      }
      if (eventId) {
        filter.push({ term: { event_id: eventId } });
      }
      const response = await client.search({
        space,
        size: size + 1,
        query: { bool: { filter } },
        sort: [{ '@timestamp': 'desc' }, { detection_id: 'asc' }],
        search_after: decodeCursor(cursor),
      });
      const hits = response.hits.hits;
      const page = hits.slice(0, size);
      return {
        items: page.flatMap((hit) => (hit._source ? [hit._source as EngineDetection] : [])),
        next_cursor: hits.length > size ? encodeCursor(page[page.length - 1]?.sort) : undefined,
      };
    },

    async countDetections(since) {
      const client = await detections();
      const response = await client.search({
        space,
        size: 0,
        track_total_hits: true,
        query: { bool: { filter: [{ range: { '@timestamp': { gte: since } } }] } },
      });
      const total = response.hits.total;
      return typeof total === 'number' ? total : total?.value ?? 0;
    },

    async detectionCounts(since) {
      const client = await detections();
      const response = await client.search({
        space,
        size: 0,
        query: {
          bool: { filter: since ? [{ range: { '@timestamp': { gte: since } } }] : [] },
        },
        aggs: {
          strategies: {
            terms: { field: 'strategy', size: 50 },
            aggs: {
              above_normal: {
                filter: { terms: { 'baseline.decision': ['above_normal', 'skipped'] } },
              },
              trial: { filter: { term: { outcome: 'trial_would_raise' } } },
            },
          },
        },
      });
      const buckets =
        (
          aggregation(response, 'strategies') as
            | {
                buckets: Array<{
                  key: string;
                  doc_count: number;
                  above_normal: { doc_count: number };
                  trial: { doc_count: number };
                }>;
              }
            | undefined
        )?.buckets ?? [];
      return Object.fromEntries(
        buckets.map((bucket) => [
          bucket.key,
          {
            detections: bucket.doc_count,
            above_normal: bucket.above_normal.doc_count,
            would_raise_in_trial: bucket.trial.doc_count,
          },
        ])
      );
    },

    async appendActivity(entries) {
      if (entries.length === 0) {
        return;
      }
      const client = await activity();
      for (const batch of chunk(entries, WRITE_CHUNK)) {
        // Sequential for the same reason as observations.
        const response = await withRetry(() =>
          client.create({
            space,
            documents: batch.map((entry) => ({ _id: uuidv4(), ...entry })),
          })
        );
        assertBulkOk(response, 'activity');
      }
    },

    async listActivity({ eventId, step, runId, size, cursor }) {
      const client = await activity();
      const filter: estypes.QueryDslQueryContainer[] = [];
      if (eventId) {
        filter.push({ term: { event_id: eventId } });
      }
      if (step) {
        filter.push({ term: { step } });
      }
      if (runId) {
        filter.push({ term: { run_id: runId } });
      }
      const response = await client.search({
        space,
        size: size + 1,
        query: { bool: { filter } },
        // `@timestamp` alone ties within a run; the action breaks most ties, deterministically.
        sort: [{ '@timestamp': 'desc' }, { action: 'asc' }, { step: 'asc' }],
        search_after: decodeCursor(cursor),
      });
      const hits = response.hits.hits;
      const page = hits.slice(0, size);
      return {
        items: page.flatMap((hit) => (hit._source ? [hit._source as ActivityEntry] : [])),
        next_cursor: hits.length > size ? encodeCursor(page[page.length - 1]?.sort) : undefined,
      };
    },

    async verifierFailures() {
      const client = await activity();
      const response = await client.search({
        space,
        size: 0,
        query: {
          bool: { filter: [{ term: { step: 'verifier' } }, { term: { action: 'does_not_hold' } }] },
        },
        aggs: { strategies: { terms: { field: 'strategy', size: 50 } } },
      });
      const buckets =
        (
          aggregation(response, 'strategies') as
            | { buckets: Array<{ key: string; doc_count: number }> }
            | undefined
        )?.buckets ?? [];
      return new Map(buckets.map((bucket) => [bucket.key, bucket.doc_count]));
    },

    async writeRun(run) {
      const client = await runs();
      const response = await withRetry(() =>
        client.create({
          space,
          documents: [{ _id: run.run_id, '@timestamp': run.started_at, ...run }],
        })
      );
      assertBulkOk(response, 'the run summary');
    },

    async listRuns({ size, cursor }) {
      const client = await runs();
      const response = await client.search({
        space,
        size: size + 1,
        query: { match_all: {} },
        sort: [{ '@timestamp': 'desc' }, { run_id: 'asc' }],
        search_after: decodeCursor(cursor),
      });
      const hits = response.hits.hits;
      const page = hits.slice(0, size);
      return {
        items: page.flatMap((hit) => {
          if (!hit._source) {
            return [];
          }
          const { '@timestamp': _timestamp, ...run } = hit._source;
          return [run as EngineRunSummary];
        }),
        next_cursor: hits.length > size ? encodeCursor(page[page.length - 1]?.sort) : undefined,
      };
    },

    async serviceActivity(since) {
      const [observationsClient, detectionsClient] = await Promise.all([
        observations(),
        detections(),
      ]);
      const [series, found] = await Promise.all([
        observationsClient.search({
          space,
          size: 0,
          query: {
            bool: {
              filter: [{ range: { bucket_start: { gte: since } } }],
              must_not: [{ prefix: { fingerprint: INTERNAL_SERIES_PREFIX } }],
            },
          },
          aggs: {
            services: {
              terms: { field: 'service', size: 1_000 },
              aggs: {
                strategies: {
                  terms: { field: 'strategy', size: 20 },
                  aggs: { series: { cardinality: { field: 'fingerprint' } } },
                },
              },
            },
          },
        }),
        detectionsClient.search({
          space,
          size: 0,
          query: { bool: { filter: [{ range: { '@timestamp': { gte: since } } }] } },
          aggs: { services: { terms: { field: 'service', size: 1_000 } } },
        }),
      ]);
      const serviceBuckets =
        (
          aggregation(series, 'services') as
            | {
                buckets: Array<{
                  key: string;
                  strategies: { buckets: Array<{ key: string; series: { value: number } }> };
                }>;
              }
            | undefined
        )?.buckets ?? [];
      const detectionCounts = new Map(
        (
          (
            aggregation(found, 'services') as
              | { buckets: Array<{ key: string; doc_count: number }> }
              | undefined
          )?.buckets ?? []
        ).map((bucket) => [bucket.key, bucket.doc_count])
      );
      const services = new Set([
        ...serviceBuckets.map((bucket) => bucket.key),
        ...detectionCounts.keys(),
      ]);
      return [...services].map((service) => ({
        service,
        strategies: (
          serviceBuckets.find((bucket) => bucket.key === service)?.strategies.buckets ?? []
        ).map((bucket) => ({
          strategy: bucket.key as DetectionStrategyId,
          series: bucket.series.value,
        })),
        detections: detectionCounts.get(service) ?? 0,
      }));
    },

    async clear() {
      await esClient.deleteByQuery({
        index: [
          OBSERVATIONS_DATA_STREAM,
          DETECTIONS_DATA_STREAM,
          ACTIVITY_DATA_STREAM,
          RUNS_DATA_STREAM,
        ],
        ignore_unavailable: true,
        allow_no_indices: true,
        expand_wildcards: ['open', 'hidden'],
        // No refresh: the Kibana system user may not refresh these indices, and readers
        // tolerate a second of deleted documents.
        conflicts: 'proceed',
        query: { term: { 'kibana.space_ids': spaceId } },
      });
    },
  };
}
