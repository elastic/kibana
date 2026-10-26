/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The Needs attention tiles on the Entity Analytics home page. */
export const SIGNAL_CARD_IDS = [
  'entitiesWithAlerts',
  'entitiesWithAnomalies',
  'riskMovers',
  'newlyHighCritical',
  'watchlisted',
  'newEntity',
] as const;
export type SignalCardId = (typeof SIGNAL_CARD_IDS)[number];

/** The Entity Analytics home page's periods. */
export const TIME_RANGE_OPTIONS = ['24h', '7d', '30d'] as const;
export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];
