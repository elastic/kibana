/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/entity-store/common';
import type { ObservationSeverity } from '../../types';

export const MODULE_ID = 'anomaly_detection';
export const MODULE_NAME = 'ML Anomaly Detection';
export const MODULE_PRIORITY = 6;

/** Only surface anomalies at or above this record score (0-100). */
export const MIN_RECORD_SCORE = 50;
/** Lookback window for anomaly records. */
export const ANOMALY_LOOKBACK = 'now-7d';
/** Number of top anomalies retained per entity for the observation narrative. */
export const TOP_ANOMALIES_PER_ENTITY = 3;
/** Maximum entity buckets requested per ML aggregation. */
export const ENTITY_BUCKET_LIMIT = 500;

/** Entity types with an EUID runtime mapping usable against `.ml-anomalies-*`. */
export const ANOMALY_ENTITY_TYPES: readonly EntityType[] = ['user', 'host', 'service'];

/** Maps an ML record score (0-100) to an observation severity tier. */
export const recordScoreToSeverity = (recordScore: number): ObservationSeverity => {
  if (recordScore >= 90) return 'critical';
  if (recordScore >= 75) return 'high';
  return 'medium';
};

export interface AnomalyDetail {
  readonly jobId: string;
  readonly detectorFunction: string;
  readonly recordScore: number;
  readonly timestamp: number;
  readonly fieldName?: string;
  readonly byFieldName?: string;
  readonly byFieldValue?: string;
  readonly partitionFieldName?: string;
  readonly partitionFieldValue?: string;
  readonly actual?: number;
  readonly typical?: number;
}

export interface EntityAnomalySummary {
  readonly maxRecordScore: number;
  readonly anomalyCount: number;
  readonly topAnomalies: AnomalyDetail[];
}
