/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TimeRange {
  from: string;
  to: string;
}

/**
 * Converts Kibana time strings (like 'now-90d', 'now') to ISO datetime strings
 * @param timeString - Kibana time string
 * @returns ISO datetime string
 */
const convertKibanaTimeToISO = (timeString: string): string => {
  const now = new Date();

  if (timeString === 'now') {
    return now.toISOString();
  }

  // Handle relative time formats like 'now-90d', 'now-1h', etc.
  if (timeString.startsWith('now-')) {
    const duration = timeString.substring(4); // Remove 'now-'
    const value = parseInt(duration.slice(0, -1), 10);
    const unit = duration.slice(-1);

    const date = new Date(now);

    switch (unit) {
      case 'd': // days
        date.setDate(date.getDate() - value);
        break;
      case 'h': // hours
        date.setHours(date.getHours() - value);
        break;
      case 'm': // minutes
        date.setMinutes(date.getMinutes() - value);
        break;
      case 's': // seconds
        date.setSeconds(date.getSeconds() - value);
        break;
      case 'w': // weeks
        date.setDate(date.getDate() - value * 7);
        break;
      case 'M': // months
        date.setMonth(date.getMonth() - value);
        break;
      case 'y': // years
        date.setFullYear(date.getFullYear() - value);
        break;
      default:
        // If we can't parse it, return as-is and let ESQL handle it
        return timeString;
    }

    return date.toISOString();
  }

  // If it's already in ISO format or another valid format, return as-is
  return timeString;
};

/**
 * Creates an ESQL time filter clause for the given time range
 * @param timeRange - The time range to filter by
 * @returns ESQL WHERE clause for time filtering, or empty string if no time range provided
 */
export const createTimeFilter = (timeRange?: TimeRange): string => {
  if (!timeRange) {
    return '';
  }

  const fromISO = convertKibanaTimeToISO(timeRange.from);
  const toISO = convertKibanaTimeToISO(timeRange.to);

  return `| WHERE @timestamp >= "${fromISO}" AND @timestamp <= "${toISO}"`;
};
