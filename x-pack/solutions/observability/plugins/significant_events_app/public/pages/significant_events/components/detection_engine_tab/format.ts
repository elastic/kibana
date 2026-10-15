/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const SUB_DOLLAR_DIGITS = 4;

/** `$0.1047` below a dollar, `$12.34` above, so small model costs stay readable. */
export function formatUsd(value: number): string {
  return `$${value.toFixed(value < 1 ? SUB_DOLLAR_DIGITS : 2)}`;
}

/** `16.3k`, `1.2M`. */
export function formatTokens(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value
  );
}

/** "just now", "3 min ago", "2 h ago". */
export function formatAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 45) {
    return i18n.translate('xpack.significantEventsApp.detectionEngine.format.justNow', {
      defaultMessage: 'just now',
    });
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return i18n.translate('xpack.significantEventsApp.detectionEngine.format.minutesAgo', {
      defaultMessage: '{minutes} min ago',
      values: { minutes },
    });
  }
  return i18n.translate('xpack.significantEventsApp.detectionEngine.format.hoursAgo', {
    defaultMessage: '{hours} h ago',
    values: { hours: Math.round(minutes / 60) },
  });
}

/** A measured value with its unit, as people read it: 33%, 1,102 ms, 18 lines. */
export function formatValue(value: number, unit: string): string {
  if (unit === 'ratio' || unit === 'drop') {
    return `${Math.round(value * 1000) / 10}%`;
  }
  if (unit === 'ms') {
    return `${Math.round(value).toLocaleString()} ms`;
  }
  if (unit === 'count') {
    return `${Math.round(value).toLocaleString()}`;
  }
  return `${Math.round(value * 100) / 100} ${unit}`;
}
