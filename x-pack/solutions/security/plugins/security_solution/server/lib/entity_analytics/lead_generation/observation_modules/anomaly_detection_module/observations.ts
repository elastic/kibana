/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LeadEntity, Observation } from '../../types';
import { makeObservation, entityTypeLabel } from '../utils';
import {
  MODULE_ID,
  recordScoreToSeverity,
  type AnomalyDetail,
  type EntityAnomalySummary,
} from './config';

/** Human-readable phrase for a single anomaly, e.g. "unusual count of event.action". */
const describeAnomaly = (anomaly: AnomalyDetail): string => {
  const fn = anomaly.detectorFunction || 'anomalous';
  const over = anomaly.byFieldName ?? anomaly.fieldName;
  const overValue = anomaly.byFieldValue;
  const target = over ? ` in ${over}${overValue ? ` "${overValue}"` : ''}` : '';
  const actualVsTypical =
    anomaly.actual != null && anomaly.typical != null
      ? ` (observed ${anomaly.actual}, typical ${anomaly.typical})`
      : '';
  return `${fn}${target}${actualVsTypical}`;
};

export const buildAnomalyObservation = (
  entity: LeadEntity,
  summary: EntityAnomalySummary
): Observation => {
  const label = entityTypeLabel(entity);
  const [top] = summary.topAnomalies;
  const severity = recordScoreToSeverity(summary.maxRecordScore);
  const countPhrase =
    summary.anomalyCount > 1
      ? `${summary.anomalyCount} ML-detected anomalies`
      : `an ML-detected anomaly`;

  return makeObservation(entity, MODULE_ID, {
    type: 'ml_anomaly',
    score: Math.min(100, summary.maxRecordScore),
    severity,
    confidence: 0.75,
    description: `${label} ${
      entity.name
    } triggered ${countPhrase}, the strongest scoring ${Math.round(
      summary.maxRecordScore
    )}/100 — ${describeAnomaly(top)}`,
    metadata: {
      entity_type: entity.type,
      max_record_score: summary.maxRecordScore,
      anomaly_count: summary.anomalyCount,
      job_ids: [...new Set(summary.topAnomalies.map((a) => a.jobId))],
      top_anomalies: summary.topAnomalies.map((a) => ({
        job_id: a.jobId,
        detector_function: a.detectorFunction,
        record_score: a.recordScore,
        timestamp: a.timestamp,
        field: a.byFieldName ?? a.fieldName,
        value: a.byFieldValue,
        actual: a.actual,
        typical: a.typical,
      })),
    },
  });
};
