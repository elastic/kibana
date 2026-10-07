/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSuccessfulRun, routeRunResult, runWithAssertionRetry } from './cypress_run_result';
import type { RunResult } from './cypress_run_result';
import { hasUnresolvedFailures } from './group_failure_routing';

const success = {
  runs: [],
  totalFailed: 0,
  totalDuration: 12,
} as unknown as CypressCommandLine.CypressRunResult;
const assertion = { ...success, totalFailed: 1 };
const runnerFailure: CypressCommandLine.CypressFailedRunResult = {
  status: 'failed',
  failures: 1,
  message: 'browser failed',
};

describe('Cypress result routing', () => {
  it.each([undefined, runnerFailure, assertion])(
    'retains failures and never checkpoints %p',
    (result) => {
      const failedSpecFilePaths = ['a'];
      const infraFailedSpecFilePaths: string[] = [];
      const completedSpecFilePaths: string[] = [];
      expect(
        routeRunResult({
          result,
          spec: 'a',
          failedSpecFilePaths,
          infraFailedSpecFilePaths,
          completedSpecFilePaths,
        })
      ).toBe(false);
      expect(failedSpecFilePaths).toEqual(['a']);
      expect(completedSpecFilePaths).toEqual([]);
      expect(infraFailedSpecFilePaths).toEqual(result === assertion ? [] : ['a']);
    }
  );
  it('does not accept an absent totalFailed as success', () => {
    expect(isSuccessfulRun({ runs: [] } as unknown as RunResult)).toBe(false);
  });
  it('keeps an assertion failure after an unrelated successful infra retry', () => {
    const failedSpecFilePaths = ['assertion', 'infra'];
    const infraFailedSpecFilePaths: string[] = [];
    const completedSpecFilePaths: string[] = [];
    routeRunResult({
      result: assertion,
      spec: 'assertion',
      failedSpecFilePaths,
      infraFailedSpecFilePaths,
      completedSpecFilePaths,
    });
    expect(
      routeRunResult({
        result: success,
        spec: 'infra',
        failedSpecFilePaths,
        infraFailedSpecFilePaths,
        completedSpecFilePaths,
      })
    ).toBe(true);
    expect(failedSpecFilePaths).toEqual(['assertion']);
    expect(hasUnresolvedFailures(failedSpecFilePaths, false)).toBe(true);
  });
});

describe('runWithAssertionRetry', () => {
  it.each([success, assertion, runnerFailure, undefined])(
    'records both invocations when the retry returns %p',
    async (retryResult) => {
      const execute = jest.fn().mockResolvedValueOnce(assertion).mockResolvedValueOnce(retryResult);
      const record = jest.fn();
      expect(await runWithAssertionRetry({ execute, record, spec: 'a', isRetryRun: false })).toBe(
        retryResult
      );
      expect(execute.mock.calls).toEqual([[false], [true]]);
      expect(record).toHaveBeenCalledTimes(2);
      expect(record.mock.calls[0][0]).toMatchObject({
        kind: 'assertion_failure',
        isRetryRun: false,
      });
      expect(record.mock.calls[1][0]).toMatchObject({ isRetryRun: true });
    }
  );
  it('preserves the initial record if the retry throws', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce(assertion)
      .mockRejectedValueOnce(new Error('retry threw'));
    const record = jest.fn();
    await expect(
      runWithAssertionRetry({ execute, record, spec: 'a', isRetryRun: false })
    ).rejects.toThrow('retry threw');
    expect(record).toHaveBeenCalledTimes(2);
    expect(record.mock.calls[1][0]).toMatchObject({ kind: 'runner_failure', isRetryRun: true });
  });
});
