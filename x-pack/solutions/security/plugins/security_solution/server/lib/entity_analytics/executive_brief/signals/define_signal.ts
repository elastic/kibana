/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { Availability, BriefSignal, SignalScope } from './types';

/** Identity helper that keeps a signal's scope literal, so `run` gets the right input type. */
export const defineSignal = <TScope extends SignalScope>(
  signal: BriefSignal<TScope>
): BriefSignal<TScope> => signal;

export const ALWAYS_AVAILABLE: Availability = { available: true };

/** Thrown by a signal when its data source is not there (not set up, no index yet). */
export class SignalUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'SignalUnavailableError';
  }
}

const errorType = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const { meta } = error as { meta?: { body?: { error?: { type?: unknown } } } };
  const type = meta?.body?.error?.type;
  return typeof type === 'string' ? type : undefined;
};

/** True for Elasticsearch `index_not_found_exception` errors. */
export const isIndexNotFoundError = (error: unknown): boolean =>
  errorType(error) === 'index_not_found_exception';

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Detection risk score (0-100) to severity, using the detection engine's default bands. */
export const severityFromRiskScore = (score: number | undefined): Severity | undefined => {
  if (score === undefined || !Number.isFinite(score)) {
    return undefined;
  }
  if (score >= 74) return 'critical';
  if (score >= 48) return 'high';
  if (score >= 22) return 'medium';
  return 'low';
};
