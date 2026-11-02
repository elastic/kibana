/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CypressResultRecord } from './cypress_result_report';

export const getSpecFailureSeed = (isOpen: boolean, filePath: string): string[] =>
  isOpen ? [] : [filePath];

export const hasUnresolvedFailures = (
  failedSpecFilePaths: readonly string[],
  hasFailedRetryTests: boolean
): boolean => failedSpecFilePaths.length > 0 || hasFailedRetryTests;

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
  completedSpecFilePaths?: string[];
}

/** Seed unresolved specs even when setup threw before the per-spec loop. */
export const routeGroupFailure = ({
  specFilePaths,
  failedSpecFilePaths,
  infraFailedSpecFilePaths,
  message,
  isRetryRun,
  completedSpecFilePaths = [],
}: RouteGroupFailureParams): CypressResultRecord[] => {
  const records: CypressResultRecord[] = [];

  for (const filePath of specFilePaths.filter((spec) => !completedSpecFilePaths.includes(spec))) {
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
