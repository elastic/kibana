/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SeedContext, SeededQuery } from '../types';
import { deterministicId } from '../types';

export interface MetricSeriesPoint {
  bucket: number;
  metricValue: number;
}

export interface SeededAlertSeries {
  ruleId: string;
  title: string;
  points: MetricSeriesPoint[];
}

export function toClosedMinuteEpochMs(timestamp: string | number | Date): number {
  const date = new Date(timestamp);
  date.setUTCSeconds(0, 0);
  return date.getTime();
}

export function buildMetricSeries(
  rows: Array<Record<string, unknown>>,
  seriesStartMs: number,
  seriesEndMs: number
): MetricSeriesPoint[] {
  const countsByBucket = new Map<number, number>();
  for (const row of rows) {
    const timestamp = row['@timestamp'];
    if (typeof timestamp !== 'string' && typeof timestamp !== 'number') {
      continue;
    }
    const bucket = toClosedMinuteEpochMs(timestamp);
    countsByBucket.set(bucket, (countsByBucket.get(bucket) ?? 0) + 1);
  }

  const points: MetricSeriesPoint[] = [];
  const firstBucket = toClosedMinuteEpochMs(seriesStartMs);
  const lastBucket = toClosedMinuteEpochMs(seriesEndMs);
  for (let bucket = firstBucket; bucket <= lastBucket; bucket += 60_000) {
    points.push({ bucket, metricValue: countsByBucket.get(bucket) ?? 0 });
  }
  return points;
}

/**
 * Seeds `.rule-events` with MATCH metric-series documents:
 * `{ bucket: epochMs, metric_value }` per closed minute (same shape Alerting
 * persists for ES|QL date columns). Also writes a second overlapping revision
 * for the busiest minute so readers can exercise MAX-per-minute collapse.
 */
export async function seedAlerts(
  ctx: SeedContext,
  seededQueries: SeededQuery[],
  seriesStartMs: number,
  seriesEndMs: number,
  esClient: Client,
  log: ToolingLog
): Promise<SeededAlertSeries[]> {
  const timeFilter = {
    range: {
      '@timestamp': {
        gte: new Date(seriesStartMs).toISOString(),
        lte: new Date(seriesEndMs).toISOString(),
      },
    },
  };

  const bulkOps: Array<BulkOperationContainer | Record<string, unknown>> = [];
  const seededSeries: SeededAlertSeries[] = [];

  // Single refresh before the loop — ensures all seedLogs documents are visible.
  // Use wildcard to cover all backing data stream indices, not just the write alias.
  await esClient.indices.refresh({ index: `${ctx.streamName}*` });

  for (const seededQuery of seededQueries) {
    const queryText = seededQuery.esql;

    const esqlResult = await esClient.esql.query({
      query: queryText,
      filter: timeFilter,
    });

    const rows = esqlResult.values.map((row) =>
      Object.fromEntries(esqlResult.columns.map((col, i) => [col.name, row[i]]))
    );

    const points = buildMetricSeries(rows, seriesStartMs, seriesEndMs);
    seededSeries.push({ ruleId: seededQuery.ruleId, title: seededQuery.title, points });

    log.info(
      `seedAlerts: "${seededQuery.title}" matched ${rows.length} log row(s) → ${
        points.length
      } minute bucket(s), ${
        points.filter(({ metricValue }) => metricValue > 0).length
      } non-zero (rule ${seededQuery.ruleId})`
    );

    let busiestBucket: number | undefined;
    let busiestCount = -1;
    for (const { bucket, metricValue } of points) {
      if (metricValue > busiestCount) {
        busiestBucket = bucket;
        busiestCount = metricValue;
      }
    }

    for (const { bucket, metricValue } of points) {
      const writeTime = new Date(bucket).toISOString();
      const alertDocId = deterministicId(String(bucket), seededQuery.ruleId, ctx.space);
      const doc = {
        '@timestamp': writeTime,
        scheduled_timestamp: writeTime,
        rule: {
          id: seededQuery.ruleId,
          version: 1,
        },
        group_hash: deterministicId(String(bucket), seededQuery.ruleId),
        data: {
          bucket,
          metric_value: metricValue,
        },
        status: 'breached',
        source: 'internal',
        type: 'signal',
        space_id: ctx.space,
      };

      bulkOps.push({
        create: {
          _index: '.rule-events',
          _id: alertDocId,
        },
      });
      bulkOps.push(doc);

      // Overlapping revision: later write-time, higher count (MAX should win).
      if (bucket === busiestBucket && metricValue > 0) {
        const revisionWriteTime = new Date(bucket + 30_000).toISOString();
        const revisionId = deterministicId(String(bucket), seededQuery.ruleId, ctx.space, 'rev');
        bulkOps.push({
          create: {
            _index: '.rule-events',
            _id: revisionId,
          },
        });
        bulkOps.push({
          ...doc,
          '@timestamp': revisionWriteTime,
          scheduled_timestamp: revisionWriteTime,
          data: {
            bucket,
            metric_value: metricValue + 1,
          },
        });
      }
    }
  }

  if (bulkOps.length === 0) {
    log.warning('seedAlerts: no alert documents were produced — scenario has no queries');
    return seededSeries;
  }

  const res = await esClient.bulk({ operations: bulkOps, refresh: 'wait_for' });
  if (res.errors) {
    const failedItems = res.items.filter((item) => item.create?.error).slice(0, 5);
    const reasons = failedItems.map((item) => JSON.stringify(item.create?.error)).join('; ');
    throw new Error(`Alert bulk indexing failed (${failedItems.length} item(s)): ${reasons}`);
  }

  log.info(`seedAlerts: indexed ${bulkOps.length / 2} metric-series event(s) into .rule-events`);
  return seededSeries;
}
