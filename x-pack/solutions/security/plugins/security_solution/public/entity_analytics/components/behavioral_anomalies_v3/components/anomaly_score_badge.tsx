/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * BA-v.3: anomaly score is shown as an EuiHealth dot whose color matches the
 * ML anomaly severity palette used by the swim lane chart and the severity
 * legend control (LOW / WARNING / MINOR / MAJOR / CRITICAL). Score thresholds
 * are the standard ML buckets (3/25/50/75/100).
 *
 * The file name `anomaly_score_badge.tsx` is preserved (rather than renamed
 * to `anomaly_score_health.tsx`) so the import in
 * `anomalies_table_section.tsx` stays stable across prototype iterations.
 */

import React from 'react';
import { EuiHealth, useEuiTheme } from '@elastic/eui';
import { ML_ANOMALY_THRESHOLD, getThemeResolvedSeverityColor } from '@kbn/ml-anomaly-utils';

/**
 * Map a raw anomaly score (0–100) to the ML severity bucket. Buckets mirror
 * the swim lane legend so the score dot and the swim lane cell share a color.
 */
const getSeverityThresholdForScore = (score: number): number => {
  if (score >= 75) return ML_ANOMALY_THRESHOLD.CRITICAL;
  if (score >= 50) return ML_ANOMALY_THRESHOLD.MAJOR;
  if (score >= 25) return ML_ANOMALY_THRESHOLD.MINOR;
  if (score >= 3) return ML_ANOMALY_THRESHOLD.WARNING;
  return ML_ANOMALY_THRESHOLD.LOW;
};

export const AnomalyScoreBadgeV3: React.FC<{ score: number }> = ({ score }) => {
  const { euiTheme } = useEuiTheme();
  const color = getThemeResolvedSeverityColor(getSeverityThresholdForScore(score), euiTheme);
  // `textSize="xs"` aligns with the EuiText size="xs" used by every other
  // cell in the anomalies table (timestamp, baseline, anomaly, etc.).
  // Anomaly score is displayed as an integer to keep the column compact and
  // visually aligned. The underlying value is still the raw float — we only
  // round for display.
  return (
    <EuiHealth color={color} textSize="xs">
      {Math.round(score)}
    </EuiHealth>
  );
};
