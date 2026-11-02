/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parse time window string to milliseconds.
 *
 * Supported format: `<int><unit>` where unit is one of: d, h, m, s
 * Examples: `1h`, `24h`, `7d`, `30m`, `10s`
 *
 * Defaults to 1 hour if parsing fails.
 */
export const parseTimeWindowToMs = (timeWindow: string): number => {
  const match = timeWindow.match(/^(\d+)([hdms])$/);
  if (!match) {
    return 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return 60 * 60 * 1000;
  }
};
