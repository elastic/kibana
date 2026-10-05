/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '../../common';

/**
 * Investigation severity is persisted with a numeric prefix so keyword sorting on the stored value
 * ranks most severe first (`sort_field=severity`). The API and UI use the canonical `Severity`;
 * the repository converts at the storage boundary, so no other code sees the prefixed values.
 */
export const STORED_SEVERITY_BY_SEVERITY = {
  critical: '80-critical',
  high: '60-high',
  medium: '40-medium',
  low: '20-low',
} as const satisfies Record<Severity, string>;

export type StoredSeverity = (typeof STORED_SEVERITY_BY_SEVERITY)[Severity];

export const toStoredSeverity = (severity: Severity): StoredSeverity =>
  STORED_SEVERITY_BY_SEVERITY[severity];

const SEVERITY_BY_STORED_SEVERITY: Readonly<Record<string, Severity>> = {
  '80-critical': 'critical',
  '60-high': 'high',
  '40-medium': 'medium',
  '20-low': 'low',
};

/** Returns the canonical severity for a stored value, or `undefined` when absent or unknown. */
export const fromStoredSeverity = (stored: string | undefined): Severity | undefined =>
  stored === undefined ? undefined : SEVERITY_BY_STORED_SEVERITY[stored];
