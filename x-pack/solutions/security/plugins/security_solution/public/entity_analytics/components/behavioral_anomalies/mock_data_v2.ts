/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype mock data for the right-panel "v.2" Behavioral anomalies overview.
 * Mirrors the structure of `mock_data.ts` but spans the last 1 year with
 * weekly buckets so the swim lane reads as a year-at-a-glance view.
 *
 * Cleanup: delete this file together with `behavioral_anomalies_overview_v2.tsx`
 * and `behavioral_anomalies_swimlane_v2.tsx` if v.2 is dropped before hand-off.
 */

import dateMath from '@kbn/datemath';
import { BEHAVIORAL_ANOMALIES_PROTOTYPE_ENTITY_ID } from './constants';
import type { EntityBehavioralAnomaliesSummary, HeatmapRecord } from './types';

/** Time window for the v.2 overview swim lane. */
export const BEHAVIORAL_ANOMALIES_V2_TIME_RANGE = { from: 'now-1y', to: 'now' } as const;

/** Bucket size driving the heatmap x-axis ticks (1 week, ~52 cells across a year). */
export const BEHAVIORAL_ANOMALIES_V2_BUCKET_DAYS = 7;

/** Total anomaly count shown in the v.2 overview header. */
export const MOCK_ANOMALY_V2_TOTAL_COUNT = 142;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hard-coded weeks-ago offsets plus a record score, sprinkled across the year
 * to look like real anomaly traffic.
 */
const WEEKLY_ANOMALY_SCORES: ReadonlyArray<{ weeksAgo: number; record_score: number }> = [
  { weeksAgo: 51, record_score: 22 },
  { weeksAgo: 49, record_score: 38 },
  { weeksAgo: 44, record_score: 64 },
  { weeksAgo: 40, record_score: 28 },
  { weeksAgo: 36, record_score: 18 },
  { weeksAgo: 31, record_score: 72 },
  { weeksAgo: 26, record_score: 55 },
  { weeksAgo: 22, record_score: 12 },
  { weeksAgo: 18, record_score: 88 },
  { weeksAgo: 14, record_score: 46 },
  { weeksAgo: 10, record_score: 30 },
  { weeksAgo: 7, record_score: 67 },
  { weeksAgo: 4, record_score: 80 },
  { weeksAgo: 2, record_score: 41 },
  { weeksAgo: 0, record_score: 92 },
];

const resolveTimeMillis = (value: string): number => {
  const parsed = dateMath.parse(value)?.valueOf();
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }
  const native = new Date(value).getTime();
  return Number.isFinite(native) ? native : Date.now();
};

/** Year-long heatmap records placed at the centre of each bucket. */
export const getPrototypeHeatmapRecordsV2 = (): HeatmapRecord[] => {
  const nowMs = resolveTimeMillis(BEHAVIORAL_ANOMALIES_V2_TIME_RANGE.to);
  const entityId = BEHAVIORAL_ANOMALIES_PROTOTYPE_ENTITY_ID;
  const bucketMs = BEHAVIORAL_ANOMALIES_V2_BUCKET_DAYS * DAY_MS;

  return WEEKLY_ANOMALY_SCORES.map(({ weeksAgo, record_score }) => ({
    '@timestamp': nowMs - weeksAgo * bucketMs - bucketMs / 2,
    record_score,
    entity_id: entityId,
  }));
};

/** Prototype summary for the v.2 overview header + swim lane. */
export const getMockBehavioralAnomaliesV2Summary = (): EntityBehavioralAnomaliesSummary => ({
  totalCount: MOCK_ANOMALY_V2_TOTAL_COUNT,
  heatmapRecords: getPrototypeHeatmapRecordsV2(),
});
