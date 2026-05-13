/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SILENCE_THRESHOLD_HOURS, DROP_THRESHOLD_RATIO } from './constants';

/** @deprecated Use PipelineVolumeStats.silenceDetected / dropSeverity instead. */
type DataStreamHealthStatus = 'healthy' | 'silent' | 'drop';

/**
 * Determines whether a data stream is silent based on the last indexed document timestamp.
 * Returns true when the most recent document is older than SILENCE_THRESHOLD_HOURS.
 */
export const isDataStreamSilent = (maxTimestampMs: number | null): boolean => {
  if (maxTimestampMs === null) return false;
  const ageMs = Date.now() - maxTimestampMs;
  return ageMs > SILENCE_THRESHOLD_HOURS * 60 * 60 * 1000;
};

/**
 * Determines whether a data stream has experienced a significant volume drop.
 * Returns true when today's doc count is below DROP_THRESHOLD_RATIO × the 7-day baseline.
 */
export const isDataStreamDrop = (
  todayDocCount: number,
  sevenDayBaseline: number | null
): boolean => {
  if (sevenDayBaseline === null || sevenDayBaseline === 0) return false;
  return todayDocCount < sevenDayBaseline * DROP_THRESHOLD_RATIO;
};

/**
 * Computes the overall health status for a data stream.
 * Priority: silent > drop > healthy.
 */
export const getDataStreamHealthStatus = (
  silenceDetected: boolean,
  dropDetected: boolean
): DataStreamHealthStatus => {
  if (silenceDetected) return 'silent';
  if (dropDetected) return 'drop';
  return 'healthy';
};
