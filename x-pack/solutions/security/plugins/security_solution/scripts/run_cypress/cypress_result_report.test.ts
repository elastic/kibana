/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('fs', () => ({
  appendFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo-root',
}));

import fs from 'fs';
import path from 'path';
import { recordCypressResult, getReportFilePath, __resetForTesting } from './cypress_result_report';

const appendFileSync = fs.appendFileSync as jest.Mock;
const mkdirSync = fs.mkdirSync as jest.Mock;

describe('cypress_result_report', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    __resetForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;
    __resetForTesting();
  });

  describe('getReportFilePath', () => {
    it('derives the filename from BUILDKITE_RETRY_COUNT, BUILDKITE_PARALLEL_JOB, and BUILDKITE_STEP_ID', () => {
      process.env.BUILDKITE_RETRY_COUNT = '2';
      process.env.BUILDKITE_PARALLEL_JOB = '5';
      process.env.BUILDKITE_STEP_ID = '01890abc-1234-5678-9abc-def012345678';

      const filePath = getReportFilePath();

      expect(filePath).toBe(
        path.join(
          '/repo-root',
          'target',
          'cypress-results',
          'cypress-attempt-2-job-5-01890abc.ndjson'
        )
      );
    });

    it('falls back to retry=0, job=0, unknown step when env vars are missing', () => {
      delete process.env.BUILDKITE_RETRY_COUNT;
      delete process.env.BUILDKITE_PARALLEL_JOB;
      delete process.env.BUILDKITE_STEP_ID;

      const filePath = getReportFilePath();

      expect(filePath).toBe(
        path.join(
          '/repo-root',
          'target',
          'cypress-results',
          'cypress-attempt-0-job-0-unknown.ndjson'
        )
      );
    });

    it('memoizes the file path for the lifetime of the process', () => {
      process.env.BUILDKITE_RETRY_COUNT = '0';
      process.env.BUILDKITE_PARALLEL_JOB = '0';
      process.env.BUILDKITE_STEP_ID = 'step-one';

      const first = getReportFilePath();

      process.env.BUILDKITE_RETRY_COUNT = '1';
      process.env.BUILDKITE_STEP_ID = 'step-two';

      expect(getReportFilePath()).toBe(first);
    });
  });

  describe('recordCypressResult', () => {
    beforeEach(() => {
      process.env.BUILDKITE_BUILD_NUMBER = '431353';
      process.env.BUILDKITE_JOB_ID = 'job-abc';
      process.env.BUILDKITE_STEP_ID = 'step-one';
      process.env.BUILDKITE_PARALLEL_JOB = '3';
      process.env.BUILDKITE_RETRY_COUNT = '1';
      process.env.BUILDKITE_AGENT_NAME = 'bk-agent-prod-gcp-999';
    });

    it('writes a single NDJSON record with normalized spec path and buildkite metadata', () => {
      recordCypressResult({
        spec: '/opt/buildkite-agent/builds/bk-agent-prod-gcp-123/elastic/kibana-pull-request/kibana/x-pack/test/spec.cy.ts',
        kind: 'success',
        totalFailed: 0,
        isRetryRun: false,
        durationMs: 42000,
      });

      expect(appendFileSync).toHaveBeenCalledTimes(1);
      const [, payload] = appendFileSync.mock.calls[0];
      expect(payload.endsWith('\n')).toBe(true);

      const parsed = JSON.parse(payload);
      expect(parsed).toMatchObject({
        spec: 'x-pack/test/spec.cy.ts',
        kind: 'success',
        totalFailed: 0,
        isRetryRun: false,
        durationMs: 42000,
        buildkite: {
          buildNumber: '431353',
          jobId: 'job-abc',
          stepId: 'step-one',
          parallelJob: '3',
          retryCount: '1',
          agentName: 'bk-agent-prod-gcp-999',
        },
      });
      expect(typeof parsed.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(parsed.timestamp))).toBe(false);
    });

    it('appends on each call (uses appendFileSync, not writeFileSync)', () => {
      recordCypressResult({ spec: 'a.cy.ts', kind: 'success', isRetryRun: false });
      recordCypressResult({
        spec: 'b.cy.ts',
        kind: 'runner_failure',
        status: 'failed',
        message: 'boom',
        isRetryRun: true,
      });
      recordCypressResult({ spec: 'c.cy.ts', kind: 'undefined_result', isRetryRun: false });

      expect(appendFileSync).toHaveBeenCalledTimes(3);
      const filePaths = appendFileSync.mock.calls.map((call) => call[0]);
      expect(new Set(filePaths).size).toBe(1); // all three appended to the same file

      const kinds = appendFileSync.mock.calls.map((call) => JSON.parse(call[1]).kind);
      expect(kinds).toEqual(['success', 'runner_failure', 'undefined_result']);
    });

    it('ensures the results directory exists before writing', () => {
      recordCypressResult({ spec: 'a.cy.ts', kind: 'success', isRetryRun: false });

      expect(mkdirSync).toHaveBeenCalledTimes(1);
      const [dir, opts] = mkdirSync.mock.calls[0];
      expect(dir).toBe(path.join('/repo-root', 'target', 'cypress-results'));
      expect(opts).toEqual({ recursive: true });
    });

    it('only calls mkdirSync once across repeated writes', () => {
      recordCypressResult({ spec: 'a.cy.ts', kind: 'success', isRetryRun: false });
      recordCypressResult({ spec: 'b.cy.ts', kind: 'success', isRetryRun: false });
      recordCypressResult({ spec: 'c.cy.ts', kind: 'success', isRetryRun: false });

      expect(mkdirSync).toHaveBeenCalledTimes(1);
      expect(appendFileSync).toHaveBeenCalledTimes(3);
    });

    it('swallows errors from mkdirSync without throwing', () => {
      mkdirSync.mockImplementationOnce(() => {
        throw new Error('permission denied');
      });

      expect(() =>
        recordCypressResult({ spec: 'a.cy.ts', kind: 'success', isRetryRun: false })
      ).not.toThrow();
    });

    it('swallows errors from appendFileSync without throwing', () => {
      appendFileSync.mockImplementationOnce(() => {
        throw new Error('disk full');
      });

      expect(() =>
        recordCypressResult({ spec: 'a.cy.ts', kind: 'success', isRetryRun: false })
      ).not.toThrow();
    });

    it('serializes optional fields only when provided', () => {
      recordCypressResult({
        spec: 'a.cy.ts',
        kind: 'assertion_failure',
        totalFailed: 3,
        isRetryRun: true,
      });

      const parsed = JSON.parse(appendFileSync.mock.calls[0][1]);
      expect(parsed.totalFailed).toBe(3);
      expect(parsed.kind).toBe('assertion_failure');
      expect(parsed.isRetryRun).toBe(true);
      // Unset fields should not appear with undefined values (JSON.stringify drops them).
      expect(Object.prototype.hasOwnProperty.call(parsed, 'status')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(parsed, 'message')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(parsed, 'durationMs')).toBe(false);
    });
  });
});
