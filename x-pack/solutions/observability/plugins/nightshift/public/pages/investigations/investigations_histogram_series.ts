/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import type {
  InvestigationsSeverityFilter,
  InvestigationsStateFilter,
} from '../../data/investigations/investigations_url';

export type InvestigationsHistogramBreakdown = 'none' | 'severity' | 'state';

export interface HistogramPoint {
  x: number;
  y: number;
}

export interface HistogramSeries {
  id: string;
  name: string;
  data: HistogramPoint[];
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const SEVERITY_ORDER: InvestigationsSeverityFilter[] = [
  'critical',
  'high',
  'medium',
  'low',
  'none',
];

const STATE_ORDER: InvestigationsStateFilter[] = ['open', 'closed', 'archived'];

export const lastUpdatedMs = (investigation: InvestigationSummary): number | null => {
  const updated = Date.parse(investigation.updated_at || investigation.created_at);
  return Number.isFinite(updated) ? updated : null;
};

export const chooseBucketIntervalMs = (fromMs: number, toMs: number): number => {
  const span = Math.max(toMs - fromMs, MINUTE);
  const targetBuckets = 24;
  const raw = span / targetBuckets;
  const candidates = [MINUTE, 5 * MINUTE, 15 * MINUTE, HOUR, 6 * HOUR, DAY, 7 * DAY];
  return candidates.find((candidate) => candidate >= raw) ?? 7 * DAY;
};

const floorToInterval = (ms: number, intervalMs: number): number =>
  Math.floor(ms / intervalMs) * intervalMs;

const severityKey = (investigation: InvestigationSummary): InvestigationsSeverityFilter =>
  investigation.metadata.severity ?? 'none';

export const buildInvestigationsHistogramSeries = ({
  investigations,
  fromMs,
  toMs,
  breakdown,
  severityOf,
  stateOf,
}: {
  investigations: InvestigationSummary[];
  fromMs: number;
  toMs: number;
  breakdown: InvestigationsHistogramBreakdown;
  severityOf: (investigation: InvestigationSummary) => InvestigationsSeverityFilter;
  stateOf: (investigation: InvestigationSummary) => InvestigationsStateFilter;
}): { series: HistogramSeries[]; intervalMs: number } => {
  const intervalMs = chooseBucketIntervalMs(fromMs, toMs);
  const start = floorToInterval(fromMs, intervalMs);
  const end = floorToInterval(toMs, intervalMs);
  const bucketStarts: number[] = [];
  for (let t = start; t <= end; t += intervalMs) {
    bucketStarts.push(t);
  }
  if (bucketStarts.length === 0) {
    bucketStarts.push(start);
  }

  const emptyBuckets = (): Map<number, number> => {
    const map = new Map<number, number>();
    for (const bucket of bucketStarts) {
      map.set(bucket, 0);
    }
    return map;
  };

  const seriesKeys =
    breakdown === 'severity'
      ? SEVERITY_ORDER
      : breakdown === 'state'
      ? STATE_ORDER
      : (['all'] as const);

  const counts = new Map<string, Map<number, number>>();
  for (const key of seriesKeys) {
    counts.set(key, emptyBuckets());
  }

  for (const investigation of investigations) {
    const updated = lastUpdatedMs(investigation);
    if (updated == null || updated < fromMs || updated > toMs) {
      continue;
    }
    const bucket = floorToInterval(updated, intervalMs);
    const key =
      breakdown === 'severity'
        ? severityOf(investigation)
        : breakdown === 'state'
        ? stateOf(investigation)
        : 'all';
    const buckets = counts.get(key) ?? emptyBuckets();
    if (!counts.has(key)) {
      counts.set(key, buckets);
    }
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  const series: HistogramSeries[] = [...counts.entries()].map(([id, buckets]) => ({
    id,
    name:
      id === 'all'
        ? 'Investigations'
        : id === 'none'
        ? 'None'
        : id.charAt(0).toUpperCase() + id.slice(1),
    data: bucketStarts.map((x) => ({ x, y: buckets.get(x) ?? 0 })),
  }));

  return { series, intervalMs };
};

export { severityKey };
