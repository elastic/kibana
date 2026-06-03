/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttacksVolumeChartPoint } from './types';

/**
 * Get the interval between two times
 * @param start - The start time
 * @param end - The end time
 * @returns The interval in milliseconds
 */
export const getInterval = (start: number, end: number): number => {
  const diff = end - start;
  const hour = 3600 * 1000;
  const day = 24 * hour;

  if (diff <= 24 * hour) return hour;
  if (diff <= 30 * day) return day;
  return day;
};

export interface ParseAttacksVolumeDataProps {
  /** Map of attack ID to start time (in milliseconds) */
  attackStartTimes: Record<string, number>;
  /** Time interval in milliseconds for binning */
  intervalMs: number;
  /** Optional start time of the chart range (ms) */
  min?: number;
  /** Optional end time of the chart range (ms) */
  max?: number;
}

/**
 * Parse attack start times into a chart data series
 * This function bins the attack start times into the appropriate time intervals and returns a chart data series.
 * It also extends the range to include the earliest and latest start times if they are outside the min/max range.
 *
 * @param props - The props for the parseAttacksVolumeData function
 * @returns The chart data series
 */
export const parseAttacksVolumeData = ({
  attackStartTimes,
  intervalMs,
  min,
  max,
}: ParseAttacksVolumeDataProps): AttacksVolumeChartPoint[] => {
  const counts: Record<number, number> = {};

  // If min/max provided, fill the range with 0s
  // We expand the range to include the earliest start time if it's before the min
  let start = min;
  let end = max;

  if (intervalMs > 0) {
    if (min !== undefined) {
      const minStartTime = Object.values(attackStartTimes).reduce(
        (earliest, current) => Math.min(earliest, current),
        min
      );
      start = Math.floor(minStartTime / intervalMs) * intervalMs;
    }

    if (max !== undefined) {
      const maxStartTime = Object.values(attackStartTimes).reduce(
        (latest, current) => Math.max(latest, current),
        max
      );
      end = Math.floor(maxStartTime / intervalMs) * intervalMs;
    }
  }

  if (start !== undefined && end !== undefined && intervalMs > 0) {
    // Determine the aligned end time for the loop
    // We used to just use max, but now we use the extended 'end'
    const loopEnd = Math.floor(end / intervalMs) * intervalMs;

    for (let time = start; time <= loopEnd; time += intervalMs) {
      counts[time] = 0;
    }
  }

  Object.values(attackStartTimes).forEach((timestamp) => {
    const binnedTime = Math.floor(timestamp / intervalMs) * intervalMs;
    // We count it if we have a binned time.
    // If we initialized 'counts' with a range, it will accumulate there.
    // If it falls outside the pre-filled range but we found a valid timestamp,
    // we should probably include it or extend the range.
    // Given the logic above extends 'start' and 'end' based on min/maxStartTime, it should be covered.
    counts[binnedTime] = (counts[binnedTime] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([time, count]) => ({
      x: parseInt(time, 10),
      y: count,
    }))
    .sort((a, b) => a.x - b.x);
};
