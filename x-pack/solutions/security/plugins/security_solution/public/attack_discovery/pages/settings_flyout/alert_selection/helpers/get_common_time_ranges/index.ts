/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

export interface TimeRangeLabel {
  start:
    | 'now/d'
    | 'now/w'
    | 'now-15m'
    | 'now-30m'
    | 'now-1h'
    | 'now-24h'
    | 'now-7d'
    | 'now-30d'
    | 'now-90d'
    | 'now-1y';
  end: 'now';
  label: string;
}

export const getCommonTimeRanges = (): TimeRangeLabel[] => [
  { start: 'now/d', end: 'now', label: i18n.TODAY },
  { start: 'now/w', end: 'now', label: i18n.THIS_WEEK },
  { start: 'now-15m', end: 'now', label: i18n.LAST_15_MINUTES },
  { start: 'now-30m', end: 'now', label: i18n.LAST_30_MINUTES },
  { start: 'now-1h', end: 'now', label: i18n.LAST_1_HOUR },
  { start: 'now-24h', end: 'now', label: i18n.LAST_24_HOURS },
  { start: 'now-7d', end: 'now', label: i18n.LAST_7_DAYS },
  { start: 'now-30d', end: 'now', label: i18n.LAST_30_DAYS },
  { start: 'now-90d', end: 'now', label: i18n.LAST_90_DAYS },
  { start: 'now-1y', end: 'now', label: i18n.LAST_1_YEAR },
];
