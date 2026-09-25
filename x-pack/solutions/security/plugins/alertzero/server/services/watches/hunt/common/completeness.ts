/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HuntCompleteness,
  HuntIncompleteness,
  HuntIncompleteReason,
} from '@kbn/alertzero-common';

/**
 * Gaps a later run could close on its own. Everything else is deterministic: the
 * same report produces the same gap every run, so leaving it eligible re-spends
 * the run forever without ever covering more.
 */
const RETRYABLE_REASONS: ReadonlySet<HuntIncompleteReason> = new Set<HuntIncompleteReason>([
  'search_partial',
  'index_unavailable',
  'generation_failed',
  'execute_failed',
]);

export const isRetryableIncompleteReason = (reason: HuntIncompleteReason): boolean =>
  RETRYABLE_REASONS.has(reason);

/**
 * Collapses a run's coverage gaps into the one value a caller decides on.
 *
 * A retryable gap wins over a deterministic one because retrying still gains
 * something: the next run closes the transient half and reports the remainder as
 * `incomplete_final`, so the report settles instead of cycling.
 */
export const huntCompletenessOf = (gaps: readonly HuntIncompleteness[]): HuntCompleteness => {
  if (gaps.length === 0) return 'complete';
  return gaps.some(({ reason }) => isRetryableIncompleteReason(reason))
    ? 'incomplete_retryable'
    : 'incomplete_final';
};

/**
 * Whether the report stays eligible for a later run. Deliberately true for
 * `incomplete_final`: the report is retired because re-running it cannot cover
 * more, which is not the same as the run having searched the environment. Callers
 * recording a hunt outcome must read `completeness` for that distinction rather
 * than treating this flag as "clean".
 */
export const completedSuccessfully = (completeness: HuntCompleteness): boolean =>
  completeness !== 'incomplete_retryable';
