/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HistogramInterval } from '../types/applications';

/** Above ES|QL's default of 1,000 rows, which a long range of daily buckets passes. */
export const MAX_SERIES_ROWS = 10_000;

const DURATION_UNITS: Readonly<Record<HistogramInterval['unit'], string>> = {
  s: 'second',
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year',
};

/** A histogram interval as an ES|QL duration, e.g. `30 seconds` or `1 day`. */
export const toEsqlDuration = ({ value, unit }: HistogramInterval): string =>
  `${value} ${DURATION_UNITS[unit]}${value === 1 ? '' : 's'}`;
