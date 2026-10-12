/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ── constants ────────────────────────────────────────────────────────────────

/** Open alert counts per severity, set by the alert queries next to `alert_count`. */
export const SEVERITY_COUNT_FIELDS = {
  critical: 'alert_critical',
  high: 'alert_high',
  medium: 'alert_medium',
  low: 'alert_low',
} as const;

// ── types ────────────────────────────────────────────────────────────────────

export type Row = Record<string, unknown>;

// ── row readers ──────────────────────────────────────────────────────────────

/** Reads a number field of a row; `undefined` when it is absent or not a number. */
export const getNumber = (row: Row, field: string): number | undefined => {
  const value = row[field];
  return typeof value === 'number' ? value : undefined;
};
