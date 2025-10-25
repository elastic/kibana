/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Calculate event time range based on original event times from alerts.
 * For multiple events, uses earliest time - 30m as start and latest time + 30m as end.
 *
 * @param originEventIds - Array of origin events with optional originalTime field
 * @returns Object with eventTimeStart and eventTimeEnd, or undefined if no valid times found
 */
export const getEventTimeRange = (
  originEventIds: Array<{ id: string; isAlert: boolean; originalTime?: string }>
): { eventTimeStart?: string; eventTimeEnd?: string } => {
  const originalTimes = originEventIds
    .filter((event) => event.isAlert && event.originalTime)
    .map((event) => event.originalTime as string);

  if (originalTimes.length === 0) {
    return { eventTimeStart: undefined, eventTimeEnd: undefined };
  }

  // Find the earliest and latest original times
  const timestamps = originalTimes.map((time) => new Date(time).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);

  // Use earliest time - 30m as start and latest time + 30m as end
  // This ensures we capture all events across the full time range
  const startTime = new Date(minTime).toISOString();
  const endTime = new Date(maxTime).toISOString();

  return {
    eventTimeStart: `${startTime}||-30m`,
    eventTimeEnd: `${endTime}||+30m`,
  };
};

/**
 * Calculate event time range for a single alert.
 * Applies ±30 minute window based on the original event time.
 *
 * @param isAlert - Whether the event is an alert
 * @param originalTime - The original event time from kibana.alert.original_time
 * @returns Object with eventTimeStart and eventTimeEnd, or undefined if not applicable
 */
export const getEventTimeRangeForSingleAlert = (
  isAlert: boolean,
  originalTime?: string | null
): { eventTimeStart?: string; eventTimeEnd?: string } => {
  if (!isAlert || !originalTime) {
    return { eventTimeStart: undefined, eventTimeEnd: undefined };
  }

  // Apply ±30 minute window based on the original event time
  return {
    eventTimeStart: `${originalTime}||-30m`,
    eventTimeEnd: `${originalTime}||+30m`,
  };
};
