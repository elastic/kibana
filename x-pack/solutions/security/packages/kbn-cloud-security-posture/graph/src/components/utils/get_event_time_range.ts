/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Calculate a unified time range that encompasses both alert and original event times.
 * This ensures all related events are captured in a single query.
 *
 * For alerts with originalEventTime:
 * - Uses the earlier of (alert time, original event time) minus 30m as start
 * - Uses the later of (alert time, original event time) plus 30m as end
 *
 * For events or alerts without originalEventTime:
 * - Uses the document timestamp with ±30m buffer
 *
 * @param timestamp - The document timestamp (@timestamp field)
 * @param isAlert - Whether the document is an alert
 * @param originalEventTime - The original event time (kibana.alert.original_time) for alerts
 * @returns Object with start and end time range strings
 */
export const getUnifiedTimeRange = (
  timestamp: string,
  isAlert: boolean,
  originalEventTime?: string | null
): { start: string; end: string } => {
  if (isAlert && originalEventTime) {
    // Compare timestamps and use the earlier one to ensure we capture all related events
    const alertTime = new Date(timestamp).getTime();
    const originalTime = new Date(originalEventTime).getTime();
    const earliestTime = new Date(Math.min(alertTime, originalTime)).toISOString();
    const latestTime = new Date(Math.max(alertTime, originalTime)).toISOString();

    return {
      start: `${earliestTime}||-30m`,
      end: `${latestTime}||+30m`,
    };
  }

  // For events or alerts without originalEventTime, use the document timestamp
  return {
    start: `${timestamp}||-30m`,
    end: `${timestamp}||+30m`,
  };
};
