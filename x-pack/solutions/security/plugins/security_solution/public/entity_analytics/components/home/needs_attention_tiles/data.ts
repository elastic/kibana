/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOneOf } from '../entities_grid/common';

export const SIGNAL_CARD_IDS = [
  'entitiesWithAlerts',
  'entitiesWithAnomalies',
  'riskMovers',
  'newlyHighCritical',
  'watchlisted',
  'newEntity',
] as const;

export type SignalCardId = (typeof SIGNAL_CARD_IDS)[number];

export const isSignalCardId = (v: string | null): v is SignalCardId => isOneOf(SIGNAL_CARD_IDS, v);

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
  /** True while the delta query is in flight, to show a spinner in place of the badge number. */
  isDeltaLoading?: boolean;
  /** True when the history is too short to compare with the previous period: the tile says so. */
  isDeltaUnavailable?: boolean;
  filterLabel: string;
  trend?: number[];
}
