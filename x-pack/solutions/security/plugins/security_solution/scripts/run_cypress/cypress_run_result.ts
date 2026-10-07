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
    const index = failedSpecFilePaths.indexOf(spec);
    if (index !== -1) failedSpecFilePaths.splice(index, 1);
    completedSpecFilePaths.push(spec);
    return true;
  }
  if (!failedSpecFilePaths.includes(spec)) failedSpecFilePaths.push(spec);
  if ((!result || isCypressFailedRunResult(result)) && !infraFailedSpecFilePaths.includes(spec)) {
    infraFailedSpecFilePaths.push(spec);
  }
  return false;
};
