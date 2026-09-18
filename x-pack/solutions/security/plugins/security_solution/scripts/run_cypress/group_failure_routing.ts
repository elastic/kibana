/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CypressResultRecord } from './cypress_result_report';

export interface RouteGroupFailureParams {
  /** Every spec belonging to the group whose setup/run threw. */
  specFilePaths: string[];
  /** Mutable, seeded in place: specs the final exit check still treats as failing. */
  failedSpecFilePaths: string[];
  /** Mutable, seeded in place: specs eligible for the infra-retry pass. */
  infraFailedSpecFilePaths: string[];
  /** Normalized message of the throw. */
  message: string;
  isRetryRun: boolean;
}

/**
 * Route a group-level throw to per-spec failure state.
 *
 * Everything that can throw before the per-spec loop seeds
 * `failedSpecFilePaths` lands here: `runElasticsearch`, `runKibanaServer`,
 * `startFleetServer`, `providers.loadAll()`, `FunctionalTestRunner.run`.
 *
 * Seeding is UNCONDITIONAL on purpose. Gating it on prior membership of
 * `failedSpecFilePaths` collapses to a no-op for exactly those throws (the
 * array is still empty at that point), which leaves both arrays empty, writes
 * no `runner_failure` record, and reports the job green — the false-green
 * pathway this script exists to close. Pushes are idempotent so a partially
 * seeded group (throw inside the per-spec loop) and the infra-retry pass cannot
 * double-add.
 *
 * Mutates `failedSpecFilePaths` / `infraFailedSpecFilePaths` in place and
 * returns one `runner_failure` record per spec for the caller to persist.
 */
export const routeGroupFailure = ({
  specFilePaths,
  failedSpecFilePaths,
  infraFailedSpecFilePaths,
  message,
  isRetryRun,
}: RouteGroupFailureParams): CypressResultRecord[] => {
  const records: CypressResultRecord[] = [];

  for (const filePath of specFilePaths) {
    if (!failedSpecFilePaths.includes(filePath)) {
      failedSpecFilePaths.push(filePath);
    }
    if (!infraFailedSpecFilePaths.includes(filePath)) {
      infraFailedSpecFilePaths.push(filePath);
    }
    records.push({
      spec: filePath,
      kind: 'runner_failure',
      status: 'thrown',
      message,
      isRetryRun,
    });
  }

  return records;
};
