/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import {
  BEHAVIORAL_ANOMALIES_V2_PROTOTYPE_ENTITY_ID,
  BEHAVIORAL_ANOMALIES_V2_TIME_RANGE,
} from './constants';
import type { EntityBehavioralAnomaliesV2Summary, HeatmapRecordV2 } from './types';

/** Total anomaly count shown in the flyout overview (design mock). */
export const MOCK_ANOMALY_V2_TOTAL_COUNT = 35;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Hard-coded anomaly scores by hour index (0–23) within the 24h window.
 * Mirrors the design mock: sparse colored cells across the day.
 */
const HOURLY_ANOMALY_SCORES: ReadonlyArray<{ hourIndex: number; record_score: number }> = [
  { hourIndex: 9, record_score: 85 },
  { hourIndex: 10, record_score: 82 },
  { hourIndex: 14, record_score: 72 },
  { hourIndex: 15, record_score: 45 },
  { hourIndex: 19, record_score: 30 },
  { hourIndex: 20, record_score: 28 },
  { hourIndex: 21, record_score: 15 },
];

const resolveTimeMillis = (value: string): number => {
  const parsed = dateMath.parse(value)?.valueOf();
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }
  const native = new Date(value).getTime();
  return Number.isFinite(native) ? native : Date.now();
};

/**
 * Static heatmap records for the prototype swim lane (same data for every entity).
 */
export const getPrototypeHeatmapRecordsV2 = (): HeatmapRecordV2[] => {
  const fromMs = resolveTimeMillis(BEHAVIORAL_ANOMALIES_V2_TIME_RANGE.from);
  const entityId = BEHAVIORAL_ANOMALIES_V2_PROTOTYPE_ENTITY_ID;

  return HOURLY_ANOMALY_SCORES.map(({ hourIndex, record_score }) => ({
    '@timestamp': fromMs + hourIndex * HOUR_MS + HOUR_MS / 2,
    record_score,
    entity_id: entityId,
  }));
};

/**
 * Returns hard-coded prototype summary for the entity flyout behavioral anomalies section.
 */
export const getMockBehavioralAnomaliesV2Summary = (): EntityBehavioralAnomaliesV2Summary => ({
  totalCount: MOCK_ANOMALY_V2_TOTAL_COUNT,
  heatmapRecords: getPrototypeHeatmapRecordsV2(),
});
