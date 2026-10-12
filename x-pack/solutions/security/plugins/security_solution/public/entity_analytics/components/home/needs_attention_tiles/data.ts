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

export const SIGNAL_CARD_IDS = [
  'entitiesWithAlerts',
  'entitiesWithAnomalies',
  'riskMovers',
  'newlyHighCritical',
  'watchlisted',
  'newEntity',
] as const satisfies readonly SignalCardId[];

export const isSignalCardId = (v: string | null): v is SignalCardId =>
  v != null && (SIGNAL_CARD_IDS as readonly string[]).includes(v);

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
  filterLabel: string;
  trend?: number[];
}
