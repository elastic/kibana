/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TIME_RANGE_DAYS = { '24h': 1, '7d': 7, '30d': 30 } as const;

export type TimeRange = keyof typeof TIME_RANGE_DAYS;

export const TIME_RANGE_OPTIONS = Object.keys(TIME_RANGE_DAYS) as readonly TimeRange[];

/** One date-math start shared by every grid and tile query, so they agree; ES|QL still pushes it down. */
export const buildLookback = (range: TimeRange): string => `NOW() - ${TIME_RANGE_DAYS[range]} days`;
