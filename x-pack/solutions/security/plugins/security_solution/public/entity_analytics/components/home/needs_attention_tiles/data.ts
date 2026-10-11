/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SignalCardId =
  | 'entitiesWithAlerts'
  | 'entitiesWithAnomalies'
  | 'riskMovers'
  | 'newlyHighCritical'
  | 'watchlisted'
  | 'newEntity';

/** Shared empty list so hooks do not allocate a new `[]` on every render. */
export const EMPTY_ENTITY_IDS: string[] = [];

export interface SignalCardData {
  id: SignalCardId;
  title: string;
  value: number;
  isLoading?: boolean;
  /** Short hint shown under the dash when value is 0, e.g. which index needs data. */
  noDataMessage?: string;
  description: string;
  delta?: number;
  /** True while the delta query is in flight — show a spinner in place of the badge number. */
  isDeltaLoading?: boolean;
  filterLabel: string;
  /** One value per dot across the selected time range, oldest first. */
  trend?: number[];
  /** True while the trend query is in flight — reserves the sparkline space. */
  isTrendLoading?: boolean;
}

export interface ActiveFilter {
  type: 'card';
  cardId: SignalCardId;
  label: string;
  exclude?: boolean;
}
