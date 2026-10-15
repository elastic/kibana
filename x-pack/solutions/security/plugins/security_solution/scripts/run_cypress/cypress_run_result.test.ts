/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasFailedTests,
  isSuccessfulRun,
  routeRunResult,
  runWithAssertionRetry,
} from './cypress_run_result';
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
  it('clears every seeded occurrence of a spec after a successful infra retry', () => {
    // The per-spec loop seeds the spec on the initial pass and again on the
    // retry pass, so the array holds it twice; removing only one occurrence
    // left a stale duplicate and failed the job despite the green retry.
    const failedSpecFilePaths: string[] = ['a.cy.ts'];
    const infraFailedSpecFilePaths: string[] = [];
    const completedSpecFilePaths: string[] = [];

    expect(
      routeRunResult({
        result: runnerFailure,
        spec: 'a.cy.ts',
        failedSpecFilePaths,
        infraFailedSpecFilePaths,
        completedSpecFilePaths,
      })
    ).toBe(false);

    failedSpecFilePaths.push('a.cy.ts');
    expect(failedSpecFilePaths).toEqual(['a.cy.ts', 'a.cy.ts']);

    expect(
      routeRunResult({
        result: success,
        spec: 'a.cy.ts',
        failedSpecFilePaths,
        infraFailedSpecFilePaths,
        completedSpecFilePaths,
      })
    ).toBe(true);

    expect(failedSpecFilePaths).toEqual([]);
    expect(hasUnresolvedFailures(failedSpecFilePaths, false)).toBe(false);
  });
  it('does not accept an absent totalFailed as success', () => {
    expect(isSuccessfulRun({ runs: [] } as unknown as RunResult)).toBe(false);
  });
  it.each([
    ['a failed runner result', [runnerFailure], true],
    ['a run with totalFailed > 0', [assertion], true],
    ['a malformed result with no runs and no status', [{} as unknown as RunResult], true],
    ['an undefined result', [undefined], true],
    ['a successful run', [success], false],
    ['a successful run alongside a failed one', [success, runnerFailure], true],
  ])('hasFailedTests counts %p as failed: %p', (_, results, expected) => {
    expect(hasFailedTests(results)).toBe(expected);
  });
  it('removes every occurrence of a spec from failedSpecFilePaths after success', () => {
    const failedSpecFilePaths = ['a', 'b', 'a'];
    const infraFailedSpecFilePaths: string[] = [];
    const completedSpecFilePaths: string[] = [];
    expect(
      routeRunResult({
        result: success,
        spec: 'a',
        failedSpecFilePaths,
        infraFailedSpecFilePaths,
        completedSpecFilePaths,
      })
    ).toBe(true);
    expect(failedSpecFilePaths).toEqual(['b']);
    // 'b' never got a successful result, so it must stay unresolved.
    expect(hasUnresolvedFailures(failedSpecFilePaths, false)).toBe(true);
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
