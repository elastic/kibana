/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CypressResultRecord } from './cypress_result_report';

export type RunResult =
  | CypressCommandLine.CypressRunResult
  | CypressCommandLine.CypressFailedRunResult
  | undefined;

export const isCypressFailedRunResult = (
  result: RunResult
): result is CypressCommandLine.CypressFailedRunResult =>
  Boolean(result && 'status' in result && result.status === 'failed');

export const isSuccessfulRun = (result: RunResult): result is CypressCommandLine.CypressRunResult =>
  Boolean(result && 'runs' in result && Array.isArray(result.runs) && result.totalFailed === 0);

/** A run is failed when the runner failed, or when it is not a verifiably successful run. */
export const isFailedRun = (result: RunResult): boolean =>
  isCypressFailedRunResult(result) || !isSuccessfulRun(result);

export const hasFailedTests = (runResults: RunResult[]): boolean =>
  runResults.some((result) => isFailedRun(result));

export const classifyRunResult = (
  result: RunResult,
  spec: string,
  isRetryRun: boolean
): CypressResultRecord => {
  if (!result) return { spec, kind: 'undefined_result', isRetryRun };
  if (isCypressFailedRunResult(result)) {
    return {
      spec,
      kind: 'runner_failure',
      status: result.status,
      message: result.message,
      isRetryRun,
    };
  }
  return {
    spec,
    kind: isSuccessfulRun(result) ? 'success' : 'assertion_failure',
    totalFailed: result.totalFailed,
    durationMs: result.totalDuration,
    isRetryRun,
  };
};

export const runWithAssertionRetry = async ({
  execute,
  record,
  spec,
  isRetryRun,
}: {
  execute: (retry: boolean) => Promise<RunResult>;
  record: (result: CypressResultRecord) => void;
  spec: string;
  isRetryRun: boolean;
}): Promise<RunResult> => {
  const result = await execute(isRetryRun);
  const outcome = classifyRunResult(result, spec, isRetryRun);
  record(outcome);
  if (outcome.kind === 'assertion_failure' && outcome.totalFailed && !isRetryRun) {
    try {
      const retryResult = await execute(true);
      record(classifyRunResult(retryResult, spec, true));
      return retryResult;
    } catch (error) {
      record({
        spec,
        kind: 'runner_failure',
        status: 'thrown',
        message: error instanceof Error ? error.message : String(error),
        isRetryRun: true,
      });
      throw error;
    }
  }
  return result;
};

export const routeRunResult = ({
  result,
  spec,
  failedSpecFilePaths,
  infraFailedSpecFilePaths,
  completedSpecFilePaths,
}: {
  result: RunResult;
  spec: string;
  failedSpecFilePaths: string[];
  infraFailedSpecFilePaths: string[];
  completedSpecFilePaths: string[];
}): boolean => {
  if (isSuccessfulRun(result)) {
    // Remove every occurrence: the per-spec loop seeds the spec on each pass,
    // so a successful infra retry finds it seeded twice and removing only the
    // first occurrence would leave the job red.
    let index = failedSpecFilePaths.indexOf(spec);
    while (index !== -1) {
      failedSpecFilePaths.splice(index, 1);
      index = failedSpecFilePaths.indexOf(spec);
    }
    completedSpecFilePaths.push(spec);
    return true;
  }
  if (!failedSpecFilePaths.includes(spec)) failedSpecFilePaths.push(spec);
  if ((!result || isCypressFailedRunResult(result)) && !infraFailedSpecFilePaths.includes(spec)) {
    infraFailedSpecFilePaths.push(spec);
  }
  return false;
};
